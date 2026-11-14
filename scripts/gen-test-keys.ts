/**
 * Generate THROWAWAY keys for local e2e only -> e2e/.keys.json (gitignored).
 * These keys are random, never derived from a human seed, and only ever funded
 * on a local Hardhat node via hardhat_setBalance. Never use them on a real network.
 */
import * as fs from "fs";
import * as path from "path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const out = path.resolve(__dirname, "../e2e/.keys.json");
if (fs.existsSync(out) && !process.argv.includes("--force")) {
  console.log(`exists: ${out} (use --force to regenerate)`);
  process.exit(0);
}
const roles = ["deployer", "seller", "buyer", "feeRecipient"] as const;
const keys: Record<string, { address: string; privateKey: string }> = {};
for (const r of roles) {
  const privateKey = generatePrivateKey();
  keys[r] = { address: privateKeyToAccount(privateKey).address, privateKey };
}
fs.writeFileSync(out, JSON.stringify({ _warning: "THROWAWAY LOCAL TEST KEYS. Never fund on a real network. Gitignored.", ...keys }, null, 2) + "\n", { mode: 0o600 });
console.log(`wrote ${out}`);
for (const r of roles) console.log(`  ${r.padEnd(12)} ${keys[r].address}`);
