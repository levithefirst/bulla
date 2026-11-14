/**
 * Release gate: fails while anything a human still has to fill in remains.
 *   npm run release:check
 * Checks
 *  1. no <<PLACEHOLDER>> left in web config (web/src/**, web/index.html, contracts/deployments.json)
 *     or in docs/SUBMISSION-DRAFT.md
 *  2. the target network (RELEASE_NETWORK, default xlayerMainnet) has an escrow address and deploy block
 *  3. web/src/deweb.json has every published-site field filled (not null)
 * Exit 0 only when all pass. It reads files only; it never touches a network.
 */
import * as fs from "fs";
import * as path from "path";
import { resolveDeployment, validateEntry, type DeploymentsFile, type NetworkKey } from "../shared/deployments";

const root = path.resolve(__dirname, "..");
const network = (process.env.RELEASE_NETWORK || "xlayerMainnet") as NetworkKey;
const problems: string[] = [];
const PH = /<<[^<>\n]{1,80}>>/g;

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

const files = [
  ...walk(path.join(root, "web/src")).filter((f) => /\.(ts|tsx|json|css)$/.test(f)),
  path.join(root, "web/index.html"),
  path.join(root, "contracts/deployments.json"),
  path.join(root, "docs/SUBMISSION-DRAFT.md"),
];
for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  const found = new Set(text.match(PH) ?? []);
  if (found.size) problems.push(`${path.relative(root, f)}: ${found.size} placeholder(s) left: ${[...found].slice(0, 12).join(", ")}${found.size > 12 ? ", …" : ""}`);
}

const dep = JSON.parse(fs.readFileSync(path.join(root, "contracts/deployments.json"), "utf8")) as DeploymentsFile;
const entry = dep.networks[network];
if (!entry) problems.push(`contracts/deployments.json: no "${network}" entry`);
else {
  for (const p of validateEntry(entry)) problems.push(`contracts/deployments.json ${network}: ${p}`);
  const r = resolveDeployment(dep, network);
  if (!r.escrow) problems.push(`contracts/deployments.json ${network}: escrow is not deployed (run deploy:${network === "xlayerMainnet" ? "mainnet" : "testnet"})`);
  if (!r.token) problems.push(`contracts/deployments.json ${network}: token missing`);
}

const deweb = JSON.parse(fs.readFileSync(path.join(root, "web/src/deweb.json"), "utf8")) as Record<string, unknown>;
const missing = Object.entries(deweb).filter(([k, v]) => !k.startsWith("_") && (v === null || v === ""));
if (missing.length) problems.push(`web/src/deweb.json: not filled after DeWEB publish: ${missing.map(([k]) => k).join(", ")}`);

if (problems.length) {
  console.error(`release:check FAILED for ${network} (${problems.length} problem${problems.length > 1 ? "s" : ""}):`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error("See docs/HANDOFF.md for who fills these in.");
  process.exit(1);
}
console.log(`release:check passed for ${network}`);
