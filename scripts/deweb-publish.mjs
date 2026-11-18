// DeWEB upload to the X Layer SiteRegistry for container 0x52D7 (circuit #1 on cpu #397). ABI: Sourcify exact match of the BNB SiteRegistry impl, selectors checked in the pinned X Layer impl.
// Dry run (reads, plan, simulate): node scripts/deweb-publish.mjs   Send: OPS_KEY=... node scripts/deweb-publish.mjs send   (skips files already on chain with the same hash)
import { createPublicClient, createWalletClient, http, defineChain, toFunctionSelector, formatEther, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
const abi = JSON.parse(fs.readFileSync(new URL("./abi/SiteRegistry.abi.json", import.meta.url)));
const chain = defineChain({ id: 196, name: "X Layer", nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.xlayer.tech"] } } });
const pub = createPublicClient({ chain, transport: http() });
const REG = "0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6", IMPL = "0xa85c4143d1d4a77f54b8e4ecc9e6d1418afea45f";
const DB = "0x68809Fd2fb343aA57D0aeB7f33Defe477c9666f9";
const CONTAINER = "0x52D7504EFDF73EcdCE91411B77e154CEe353241e", OPS = "0x00f9b7a48F4B3eCdcc8288C2295E59132143B3b0";
const SITE = new URL("../deweb-out/site", import.meta.url).pathname, man = JSON.parse(fs.readFileSync(new URL("../deweb-out/manifest.json", import.meta.url)));
const CAP = 6_000_000_000_000_000n; // 0.006 OKB hard cap
const SEND = process.argv[2] === "send";
const r = (functionName, args = []) => pub.readContract({ address: REG, abi, functionName, args });
// preflight
const slot = await pub.getStorageAt({ address: REG, slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" });
const impl = getAddress("0x" + slot.slice(-40)); console.log("impl", impl, impl.toLowerCase() === IMPL);
if (impl.toLowerCase() !== IMPL) throw new Error("impl mismatch");
const code = await pub.getCode({ address: IMPL });
for (const s of ["putFile(address,string,string,bytes32,bytes)", "appendChunk(address,string,uint256,bytes)", "setFallback(address,string)", "fileInfo(address,string)", "canEdit(address,address)"]) {
  const sel = toFunctionSelector(s).slice(2); const ok = code.includes("63" + sel); console.log("selector", s, sel, ok); if (!ok) throw new Error("selector missing " + s); }
console.log("CHUNK_MAX", await r("CHUNK_MAX"), "opened", await r("isOpenedContainer", [CONTAINER]), "canEdit", await r("canEdit", [CONTAINER, OPS]));
try { const fee = await pub.readContract({ address: DB, abi: [{ type: "function", name: "monthlyFee", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" }], functionName: "monthlyFee" }); console.log("DomainBinding.monthlyFee", fee); } catch (e) { console.log("monthlyFee read failed", e.shortMessage); }
if (!(await r("canEdit", [CONTAINER, OPS]))) throw new Error("ops cannot edit");
console.log("fallback now:", JSON.stringify(await r("fallbackPath", [CONTAINER])), "pathCount", await r("pathCount", [CONTAINER]));
// plan
const steps = [];
for (const f of man.files) {
  const buf = fs.readFileSync(path.join(SITE, f.path));
  const h = "0x" + crypto.createHash("sha256").update(buf).digest("hex"); if (h !== f.sha256 || buf.length !== f.size) throw new Error("manifest mismatch " + f.path);
  let have = 0;
  try { const [size, , sha] = await r("fileInfo", [CONTAINER, f.path]); const ch = await r("chunksOf", [CONTAINER, f.path]);
    if (sha === f.sha256 && Number(size) === f.size) { console.log("skip (already complete)", f.path); continue; }
    if (sha === f.sha256) have = ch.length; } catch {}
  for (let i = have; i * 24000 < buf.length; i++) {
    const data = "0x" + buf.subarray(i * 24000, (i + 1) * 24000).toString("hex");
    steps.push(i === 0 ? { fn: "putFile", args: [CONTAINER, f.path, f.contentType, f.sha256, data], label: `PUT ${f.path}` } : { fn: "appendChunk", args: [CONTAINER, f.path, BigInt(i), data], label: `APPEND ${f.path} #${i}` });
  }
}
if ((await r("fallbackPath", [CONTAINER])) !== "index.html") steps.push({ fn: "setFallback", args: [CONTAINER, "index.html"], label: "setFallback index.html" });
const gp = await pub.getGasPrice(); const bal0 = await pub.getBalance({ address: OPS });
console.log("steps", steps.length, "gasPrice", gp, "ops balance", formatEther(bal0));
// simulate first step (later ones depend on earlier state)
if (steps.length) { const g = await pub.estimateContractGas({ address: REG, abi, functionName: steps[0].fn, args: steps[0].args, account: OPS }); console.log("simulated", steps[0].label, "gas", g); }
if (!SEND) process.exit(0);
const acct = privateKeyToAccount(process.env.OPS_KEY); if (acct.address !== OPS) throw new Error("wrong key");
const wal = createWalletClient({ account: acct, chain, transport: http() });
const log = []; let spent = 0n;
for (const s of steps) {
  const { request } = await pub.simulateContract({ address: REG, abi, functionName: s.fn, args: s.args, account: acct });
  const gas = await pub.estimateContractGas({ address: REG, abi, functionName: s.fn, args: s.args, account: acct });
  const price = (await pub.getGasPrice()) * 12n / 10n;
  if (spent + gas * price > CAP) throw new Error("cap would be exceeded at " + s.label);
  const hash = await wal.writeContract({ ...request, gas: gas * 12n / 10n, gasPrice: price });
  const rc = await pub.waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (rc.status !== "success") throw new Error("reverted " + s.label + " " + hash);
  const cost = rc.gasUsed * rc.effectiveGasPrice; spent += cost;
  log.push({ step: s.label, hash, gasUsed: rc.gasUsed.toString(), costWei: cost.toString(), block: rc.blockNumber.toString() });
  console.log("ok", s.label, hash, rc.gasUsed);
  fs.writeFileSync(new URL("../deweb-out/publish-log.json", import.meta.url), JSON.stringify({ log, spentWei: spent.toString() }, null, 2));
}
const bal1 = await pub.getBalance({ address: OPS });
console.log("spent", formatEther(spent), "balance", formatEther(bal1));
