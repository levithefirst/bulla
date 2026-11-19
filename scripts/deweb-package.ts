/**
 * Package the static web build for DeWEB (TapeOut SiteRegistry) and write a publish checklist.
 *
 *   npm run deweb:package                       # builds for X Layer mainnet (VITE_BULLA_NETWORK=xlayerMainnet)
 *   DEWEB_NETWORK=xlayerTestnet npm run deweb:package
 *
 * Output (gitignored): deweb-out/site/ (files to upload), deweb-out/manifest.json
 * (path, size, contentType, sha256, chunk count), deweb-out/bulla-site.tar.gz,
 * deweb-out/PUBLISH-CHECKLIST.md.
 *
 * This script does not publish anything and does not wrap any CLI: TapeKit has no
 * publishing CLI yet (docs/research.md §3). Rules applied come from the TapeKit
 * README "Site owner handbook".
 */
import { spawnSync } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const root = path.resolve(__dirname, "..");
const web = path.join(root, "web");
const out = path.join(root, "deweb-out");
const site = path.join(out, "site");
const network = process.env.DEWEB_NETWORK || "xlayerMainnet";
const JUDGE_URL = "https://try-usebulla.vercel.app";

// TapeKit handbook §6
const CHUNK = 24_000;
const MAX_FILE = 350 * CHUNK; // 8,400,000 bytes

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function walk(dir: string, base = dir): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join("/")];
  });
}

const problems: string[] = [];
const warnings: string[] = [];

console.log(`[deweb] building web for ${network} (mock off)`);
if (network !== "xlayerMainnet" && network !== "xlayerTestnet") {
  console.error(`[deweb] DEWEB_NETWORK must be xlayerMainnet or xlayerTestnet, got ${network}`);
  process.exit(1);
}
// The DeWEB (mainnet) package never carries the testnet demo gas-tank key.
const tankKey = process.env.VITE_DEMO_GAS_TANK_KEY;
const b = spawnSync("npx", ["vite", "build", "--emptyOutDir"], {
  cwd: web,
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_BULLA_NETWORK: network,
    VITE_MOCK: "0",
    VITE_DEMO_GAS_TANK_KEY: network === "xlayerMainnet" ? "" : (tankKey ?? ""),
    // The mainnet mirror's "Try it now on X Layer testnet" CTA must open the hosted testnet judge build.
    VITE_JUDGE_URL: process.env.VITE_JUDGE_URL || (network === "xlayerMainnet" ? JUDGE_URL : ""),
  },
});
if (b.status !== 0) process.exit(b.status ?? 1);

// Keep the record of past on-chain publishes (written by scripts/deweb-publish.mjs) across rebuilds.
const logPath = path.join(out, "publish-log.json");
const publishLog = fs.existsSync(logPath) ? fs.readFileSync(logPath) : null;
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(site, { recursive: true });
fs.cpSync(path.join(web, "dist"), site, { recursive: true });
if (publishLog) fs.writeFileSync(logPath, publishLog);

const deployments = JSON.parse(fs.readFileSync(path.join(root, "contracts/deployments.json"), "utf8"));
const escrow = deployments.networks?.[network]?.escrow ?? null;
if (!escrow && !process.env.VITE_ESCROW_ADDRESS) warnings.push(`No BullaEscrow address for ${network} in contracts/deployments.json: the published app will show "not deployed". Deploy first, then re-run.`);

const files = walk(site).sort();
if (network === "xlayerMainnet") {
  for (const f of files) {
    const text = fs.readFileSync(path.join(site, f), "latin1");
    if (tankKey && text.includes(tankKey.replace(/^0x/, ""))) problems.push(`${f}: contains the demo gas-tank key`);
    if (/Judge mode runs only|demo gas tank/i.test(text)) problems.push(`${f}: judge-mode code found in a mainnet build`);
  }
}
const manifest = files.map((p) => {
  const buf = fs.readFileSync(path.join(site, p));
  const ext = path.extname(p).toLowerCase();
  const contentType = TYPES[ext];
  if (!contentType) problems.push(`${p}: no known content type for "${ext}"`);
  if (buf.length > MAX_FILE) problems.push(`${p}: ${buf.length} bytes exceeds the 8,400,000-byte file limit`);
  if (p.endsWith(".map")) problems.push(`${p}: source map must not be published`);
  if (!/^[A-Za-z0-9._\-/]+$/.test(p)) problems.push(`${p}: use ASCII file names (NFC rule)`);
  if (p.split("/").some((s) => s === "." || s === "..")) problems.push(`${p}: "." or ".." segment`);
  if (ext === ".html" || ext === ".css") {
    const text = buf.toString("utf8");
    const ext1 = text.match(/(?:src|href|action|poster|srcset)\s*=\s*["'](?:https?:)?\/\/[^"']+/gi) ?? [];
    const ext2 = text.match(/url\(\s*["']?(?:https?:)?\/\/[^)]+\)/gi) ?? [];
    const ext3 = text.match(/@import\s+["']?(?:https?:)?\/\//gi) ?? [];
    for (const m of [...ext1, ...ext2, ...ext3]) problems.push(`${p}: off-chain reference ${m.slice(0, 80)}`);
    if (ext === ".html" && /(?:src|href)=["']\/(?!\/)/.test(text)) warnings.push(`${p}: root-relative path found; relative paths are safer`);
  }
  return {
    path: p,
    size: buf.length,
    contentType: contentType ?? "application/octet-stream",
    sha256: "0x" + crypto.createHash("sha256").update(buf).digest("hex"),
    chunks: Math.max(1, Math.ceil(buf.length / CHUNK)),
  };
});

const total = manifest.reduce((s, f) => s + f.size, 0);
const manifestHash = "0x" + crypto.createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
fs.writeFileSync(
  path.join(out, "manifest.json"),
  JSON.stringify({ network, escrow, fallbackPath: "index.html", totalBytes: total, totalChunks: manifest.reduce((s, f) => s + f.chunks, 0), manifestSha256: manifestHash, files: manifest }, null, 2) + "\n",
);
spawnSync("tar", ["-czf", path.join(out, "bulla-site.tar.gz"), "-C", site, "."], { stdio: "inherit" });

const rows = manifest.map((f) => `| \`${f.path}\` | ${f.size} | \`${f.contentType}\` | \`${f.sha256}\` | ${f.chunks} |`).join("\n");
const checklist = `# Bulla DeWEB publish checklist (generated)

Generated: ${new Date().toISOString()} · network: **${network}** · escrow: ${escrow ? `\`${escrow}\`` : "**NOT DEPLOYED**"}
Total: ${total} bytes in ${manifest.length} files, ${manifest.reduce((s, f) => s + f.chunks, 0)} chunks of ≤ 24,000 bytes.
Manifest SHA-256 (record this): \`${manifestHash}\`

## Before you publish
- [ ] Escrow deployed on ${network} and address in \`contracts/deployments.json\` (re-run this script after deploy)
- [ ] You hold the TapeOut circuit on X Layer and its container is **opened** (\`npm run probe:tapeout\` shows \`opened true\`)
- [ ] Using a dedicated wallet for the circuit: whoever holds the circuit controls the container
- [ ] No problems listed below

## Publish (pick one; both are human, wallet-signed)
A. **HashPort console** (hosted): pick the circuit, drag \`deweb-out/site/\`, confirm the two signatures. X Layer support is UNKNOWN; if it only offers BNB Chain, use B.
B. **Direct SiteRegistry calls** on X Layer (\`0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6\`), from the holder or an operator:
   1. For each file below: \`putFile(container, path, contentType, sha256, firstChunk)\` with the first ≤ 24,000 bytes
   2. For files with more than one chunk: \`appendChunk(container, path, expectIndex, chunk)\` for index 1, 2, 3 …
   3. \`setFallback(container, "index.html")\` (optional; Bulla uses hash routes)
   Exact ABI types for these writes are UNKNOWN (docs/research.md); take them from the verified contract on the explorer.

## After publishing
- [ ] Activate the name if required: \`DomainBinding.bind("<id>.2.<cpu>.tape", container, months)\`; read \`monthlyFee()\` on X Layer first (UNKNOWN)
- [ ] Open via the TapeKit gateway home \`https://tapekit.org/\` (name box) and its \`/.tape/status\` page; every file should say verified
- [ ] Compare hashes with this manifest
- [ ] Record name, processor, circuit id, container, gateway URL, manifest hash and date in \`web/src/deweb.json\` and \`docs/SUBMISSION-DRAFT.md\`, rebuild, and re-publish \`index.html\` + the JS bundle so the footer shows it

## Problems (must be empty)
${problems.length ? problems.map((p) => `- ${p}`).join("\n") : "- none"}

## Warnings
${warnings.length ? warnings.map((p) => `- ${p}`).join("\n") : "- none"}

## Files
| path | bytes | content type | sha256 | chunks |
| --- | --- | --- | --- | --- |
${rows}
`;
fs.writeFileSync(path.join(out, "PUBLISH-CHECKLIST.md"), checklist);

console.log(`[deweb] ${manifest.length} files, ${total} bytes, manifest ${manifestHash}`);
for (const w of warnings) console.log(`[deweb] WARNING: ${w}`);
for (const p of problems) console.log(`[deweb] PROBLEM: ${p}`);
console.log(`[deweb] wrote ${path.relative(root, out)}/{site/,manifest.json,bulla-site.tar.gz,PUBLISH-CHECKLIST.md}`);
if (problems.length) process.exit(1);
