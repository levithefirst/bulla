/**
 * Hermetic local E2E: no faucet, no network. See scripts/local-stack.ts for the setup.
 * Runs Playwright (e2e/bulla.spec.ts), prints PASS/FAIL, tears everything down.
 */
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { root, startLocalStack } from "./local-stack";

async function main() {
  const s = await startLocalStack({ rpcPort: Number(process.env.E2E_RPC_PORT ?? 8546), webPort: Number(process.env.E2E_WEB_PORT ?? 4174), outDir: "dist-e2e", tag: "e2e" });
  try {
    fs.writeFileSync(path.join(root, "e2e/.runtime.json"), JSON.stringify({ rpc: s.rpc, baseURL: s.baseURL, escrow: s.escrow, token: s.token, deployBlock: s.deployBlock, tapeout: s.tapeout }, null, 2));
    console.log("\n[e2e] running Playwright");
    const r = spawnSync("npx", ["playwright", "test", "--config", "e2e/playwright.config.ts", "--trace", "off", ...process.argv.slice(2)], { cwd: root, stdio: "inherit" });
    const ok = r.status === 0;
    console.log(`\n[e2e] RESULT: ${ok ? "PASS" : "FAIL"}`);
    process.exitCode = ok ? 0 : 1;
  } finally {
    s.stop();
  }
}

main().catch((e) => {
  console.error(e);
  console.log("\n[e2e] RESULT: FAIL");
  process.exitCode = 1;
});
