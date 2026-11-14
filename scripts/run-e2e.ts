/**
 * Hermetic local E2E: no faucet, no network.
 *  1. ensure throwaway keys (e2e/.keys.json)
 *  2. start a Hardhat node on E2E_RPC_PORT (default 8546)
 *  3. fund keys with hardhat_setBalance, deploy MockERC20 + BullaEscrow from the deployer key
 *  4. build the web app for localhost with the fresh addresses and serve it with vite preview
 *  5. run Playwright (e2e/bulla.spec.ts), print pass/fail, tear everything down
 */
import { spawn, spawnSync, type ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { createPublicClient, createWalletClient, http, parseUnits, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

const root = path.resolve(__dirname, "..");
const PORT = Number(process.env.E2E_RPC_PORT ?? 8546);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 4174);
const RPC = `http://127.0.0.1:${PORT}`;
const procs: ChildProcess[] = [];

function sh(cmd: string, args: string[], env: Record<string, string> = {}, cwd = root) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed (${r.status})`);
}

async function waitFor(url: string, body?: string, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, body ? { method: "POST", headers: { "content-type": "application/json" }, body } : undefined);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`timeout waiting for ${url}`);
}

async function assertPortFree(port: number) {
  try {
    await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) });
  } catch (e) {
    const code = (e as { cause?: { code?: string } }).cause?.code;
    if (code === "ECONNREFUSED") return;
  }
  throw new Error(`port ${port} is already in use; stop the old process or set E2E_RPC_PORT / E2E_WEB_PORT`);
}

function artifact(rel: string) {
  return JSON.parse(fs.readFileSync(path.join(root, "contracts/artifacts/contracts", rel), "utf8"));
}

async function main() {
  sh("npx", ["tsx", "scripts/gen-test-keys.ts"]);
  const keys = JSON.parse(fs.readFileSync(path.join(root, "e2e/.keys.json"), "utf8"));
  sh("npx", ["hardhat", "compile", "--quiet"], {}, path.join(root, "contracts"));

  console.log(`\n[e2e] starting hardhat node on ${PORT}`);
  await assertPortFree(PORT);
  await assertPortFree(WEB_PORT);
  const node = spawn("npx", ["hardhat", "node", "--port", String(PORT)], { cwd: path.join(root, "contracts"), stdio: ["ignore", "ignore", "inherit"], detached: true });
  procs.push(node);
  await waitFor(RPC, JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }));

  const pub = createPublicClient({ chain: hardhat, transport: http(RPC) });
  for (const r of ["deployer", "seller", "buyer", "feeRecipient"]) {
    await pub.request({ method: "hardhat_setBalance" as never, params: [keys[r].address, "0x56BC75E2D63100000"] as never }); // 100 ETH
  }
  const deployer = createWalletClient({ chain: hardhat, transport: http(RPC), account: privateKeyToAccount(keys.deployer.privateKey as Hex) });

  const tokenArt = artifact("mocks/MockERC20.sol/MockERC20.json");
  const escrowArt = artifact("BullaEscrow.sol/BullaEscrow.json");
  const tokenHash = await deployer.deployContract({ abi: tokenArt.abi, bytecode: tokenArt.bytecode, args: ["Mock USDC", "mUSDC", 6] });
  const token = (await pub.waitForTransactionReceipt({ hash: tokenHash })).contractAddress!;
  const escrowHash = await deployer.deployContract({ abi: escrowArt.abi, bytecode: escrowArt.bytecode, args: [token, keys.feeRecipient.address, 50, keys.deployer.address] });
  const escrowRcpt = await pub.waitForTransactionReceipt({ hash: escrowHash });
  const escrow = escrowRcpt.contractAddress!;
  const mint = await deployer.writeContract({ address: token, abi: tokenArt.abi, functionName: "mint", args: [keys.buyer.address, parseUnits("100000", 6)] });
  await pub.waitForTransactionReceipt({ hash: mint });
  console.log(`[e2e] token ${token}\n[e2e] escrow ${escrow}`);

  const outDir = "dist-e2e";
  sh("npx", ["vite", "build", "--outDir", outDir, "--emptyOutDir"], { VITE_BULLA_NETWORK: "localhost", VITE_ESCROW_ADDRESS: escrow, VITE_ESCROW_TOKEN: token, VITE_RPC_URL: RPC, VITE_MOCK: "0" }, path.join(root, "web"));
  const web = spawn("npx", ["vite", "preview", "--outDir", outDir, "--port", String(WEB_PORT), "--strictPort"], { cwd: path.join(root, "web"), stdio: ["ignore", "ignore", "inherit"], detached: true });
  procs.push(web);
  const baseURL = `http://127.0.0.1:${WEB_PORT}/`;
  await waitFor(baseURL);

  fs.writeFileSync(path.join(root, "e2e/.runtime.json"), JSON.stringify({ rpc: RPC, baseURL, escrow, token, deployBlock: Number(escrowRcpt.blockNumber) }, null, 2));

  console.log("\n[e2e] running Playwright");
  const r = spawnSync("npx", ["playwright", "test", "--config", "e2e/playwright.config.ts", "--trace", "off"], { cwd: root, stdio: "inherit" });
  const ok = r.status === 0;
  console.log(`\n[e2e] RESULT: ${ok ? "PASS" : "FAIL"}`);
  process.exitCode = ok ? 0 : 1;
}

function cleanup() {
  for (const p of procs.splice(0)) {
    try {
      if (p.pid) process.kill(-p.pid, "SIGTERM"); // whole process group (npx -> sh -> node)
    } catch {
      /* already gone */
    }
  }
}
process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

main()
  .catch((e) => {
    console.error(e);
    console.log("\n[e2e] RESULT: FAIL");
    process.exitCode = 1;
  })
  .finally(cleanup);
