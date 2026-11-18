// Activates 1.2.397.tape via DomainBinding.bind (X Layer proxy, impl pinned by TapeKit config.js). Aborts if monthlyFee != 0.
// Dry run: node scripts/deweb-bind.mjs   Send: OPS_KEY=... node scripts/deweb-bind.mjs send
import { createPublicClient, createWalletClient, http, defineChain, toFunctionSelector, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts"; import fs from "node:fs";
const abi = JSON.parse(fs.readFileSync(new URL("./abi/DomainBinding.abi.json", import.meta.url)));
const chain = defineChain({ id: 196, name: "X Layer", nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.xlayer.tech"] } } });
const pub = createPublicClient({ chain, transport: http() });
const DB = "0x68809Fd2fb343aA57D0aeB7f33Defe477c9666f9", C = "0x52D7504EFDF73EcdCE91411B77e154CEe353241e", OPS = "0x00f9b7a48F4B3eCdcc8288C2295E59132143B3b0", NAME = "1.2.397.tape";
const slot = await pub.getStorageAt({ address: DB, slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" });
const impl = "0x" + slot.slice(-40); console.log("impl", impl, impl === "0x5ebf29b80789e548907c707530c3c7607c4347df");
if (impl !== "0x5ebf29b80789e548907c707530c3c7607c4347df") throw new Error("impl");
const code = await pub.getCode({ address: impl });
for (const s of ["bind(string,address,uint256)", "monthlyFee()", "isLive(string,address)", "isContainerLive(address)", "MAX_AHEAD()"]) { const ok = code.includes("63" + toFunctionSelector(s).slice(2)); console.log(s, ok); if (!ok) throw new Error("sel " + s); }
const r = (f, a = []) => pub.readContract({ address: DB, abi, functionName: f, args: a });
const fee = await r("monthlyFee"); console.log("monthlyFee", fee, "MONTH", await r("MONTH"), "MAX_AHEAD", await r("MAX_AHEAD"), "isLive", await r("isLive", [NAME, C]), "containerLive", await r("isContainerLive", [C]));
if (fee !== 0n) throw new Error("fee nonzero, abort");
if (await r("isLive", [NAME, C])) { console.log("already live until", await r("containerPaidUntil", [C])); process.exit(0); }
const months = 120n;
const gas = await pub.estimateContractGas({ address: DB, abi, functionName: "bind", args: [NAME, C, months], value: 0n, account: OPS }); console.log("simulated bind gas", gas);
if (process.argv[2] !== "send") process.exit(0);
const acct = privateKeyToAccount(process.env.OPS_KEY); if (acct.address !== OPS) throw new Error("key");
const { request } = await pub.simulateContract({ address: DB, abi, functionName: "bind", args: [NAME, C, months], value: 0n, account: acct });
const hash = await createWalletClient({ account: acct, chain, transport: http() }).writeContract({ ...request, gas: gas * 13n / 10n, gasPrice: (await pub.getGasPrice()) * 12n / 10n });
const rc = await pub.waitForTransactionReceipt({ hash }); console.log("bind", rc.status, hash, "cost", formatEther(rc.gasUsed * rc.effectiveGasPrice));
console.log("isLive", await r("isLive", [NAME, C]), "containerPaidUntil", await r("containerPaidUntil", [C]), "bal", formatEther(await pub.getBalance({ address: OPS })));
