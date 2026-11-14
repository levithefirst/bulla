/**
 * Opt-in: the judge-mode acceptance test against X Layer TESTNET (1952).
 *   E2E_TESTNET=1 VITE_DEMO_GAS_TANK_KEY=0x... npm run e2e:testnet
 * Skips cleanly (exit 0) unless both are set. Needs xlayerTestnet.judge in contracts/deployments.json
 * (npm run deploy:judge). The tank key is a TESTNET-ONLY throwaway funded from the official faucet;
 * it is read from the environment and never written to disk by this script.
 */
import { spawn, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { readDeployments } from "../contracts/scripts/deployments";

const root = path.resolve(__dirname, "..");
const RPC = process.env.X_LAYER_TESTNET_RPC || "https://testrpc.xlayer.tech/terigon";
const PORT = Number(process.env.E2E_TESTNET_WEB_PORT ?? 4176);

async function main() {
  if (process.env.E2E_TESTNET !== "1" || !process.env.VITE_DEMO_GAS_TANK_KEY) {
    console.log("[e2e:testnet] skipped: set E2E_TESTNET=1 and VITE_DEMO_GAS_TANK_KEY (testnet gas tank) to run against X Layer testnet.");
    return;
  }
  const judge = readDeployments().networks.xlayerTestnet?.judge;
  if (!judge) throw new Error("no xlayerTestnet.judge in contracts/deployments.json; run npm run deploy:judge first");
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }) });
  const chainId = Number(BigInt((await r.json()).result));
  if (chainId !== 1952) throw new Error(`RPC ${RPC} reports chain ${chainId}; judge mode is X Layer testnet (1952) only`);

  const env = { ...process.env, VITE_BULLA_NETWORK: "xlayerTestnet", VITE_RPC_URL: RPC, VITE_MOCK: "0" };
  const b = spawnSync("npx", ["vite", "build", "--outDir", "dist-testnet", "--emptyOutDir"], { cwd: path.join(root, "web"), stdio: "inherit", env });
  if (b.status !== 0) throw new Error("testnet build failed");
  const web = spawn("npx", ["vite", "preview", "--outDir", "dist-testnet", "--port", String(PORT), "--strictPort"], { cwd: path.join(root, "web"), stdio: "ignore", detached: true });
  const stop = () => {
    try {
      if (web.pid) process.kill(-web.pid, "SIGTERM");
    } catch {
      /* gone */
    }
  };
  process.on("exit", stop);
  try {
    const baseURL = `http://127.0.0.1:${PORT}/`;
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(baseURL)).ok) break;
      } catch {
        /* not up */
      }
      await new Promise((res) => setTimeout(res, 500));
    }
    fs.writeFileSync(path.join(root, "e2e/.runtime.testnet.json"), JSON.stringify({ mode: "testnet", baseURL, rpc: RPC }, null, 2));
    const t = spawnSync("npx", ["playwright", "test", "--config", "e2e/playwright.config.ts", "--trace", "off", "e2e/judge-mode.spec.ts"], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, E2E_RUNTIME_FILE: ".runtime.testnet.json" },
    });
    console.log(`\n[e2e:testnet] RESULT: ${t.status === 0 ? "PASS" : "FAIL"}`);
    process.exitCode = t.status === 0 ? 0 : 1;
  } finally {
    stop();
  }
}

main().catch((e) => {
  console.error(`[e2e:testnet] ${e.message ?? e}`);
  process.exitCode = 1;
});
