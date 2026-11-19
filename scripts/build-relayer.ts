/**
 * Bundle the judge gas relayer (web/api/gas.ts) into one dependency-free ESM file for a static Vercel deploy:
 *   npx tsx scripts/build-relayer.ts <outDir>      # writes <outDir>/api/gas.mjs
 * The tank key is read at runtime from the DEMO_GAS_TANK_KEY env var on Vercel; nothing secret is bundled.
 */
import { buildSync } from "esbuild";
import * as fs from "fs";
import * as path from "path";

const out = process.argv[2];
if (!out) throw new Error("usage: build-relayer.ts <outDir>");
const file = path.join(out, "api", "gas.mjs");
fs.mkdirSync(path.dirname(file), { recursive: true });
buildSync({ entryPoints: [path.resolve(__dirname, "../web/api/gas.ts")], bundle: true, platform: "node", format: "esm", target: "node20", outfile: file, minify: true, legalComments: "none" });
const text = fs.readFileSync(file, "utf8");
const key = process.env.CHECK_KEY_ABSENT;
if (key && text.toLowerCase().includes(key.replace(/^0x/, "").toLowerCase())) throw new Error("[relayer] the tank key ended up in the bundle");
console.log(`[relayer] wrote ${file} (${text.length} bytes)`);
