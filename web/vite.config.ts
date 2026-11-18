import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";

// Static export for DeWEB (TapeOut SiteRegistry) and any plain static host:
// - base "./" so every asset URL is relative (TapeKit handbook §2: relative paths only)
// - hash routing in the app, so no server rewrites are needed
// - no source maps, no external CDNs, no image optimizer service
export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, "..");
  const env = { ...loadEnv(mode, envDir, "VITE_"), ...process.env };
  const network = env.VITE_BULLA_NETWORK || "xlayerMainnet";
  const judgeBuild = network === "xlayerTestnet" || network === "localhost";

  // Hard guard: the demo gas-tank key is TESTNET-ONLY and must never ship in a mainnet build.
  if (!judgeBuild && env.VITE_DEMO_GAS_TANK_KEY) {
    throw new Error(`VITE_DEMO_GAS_TANK_KEY is set for a ${network} build. Judge mode is testnet-only; unset it.`);
  }

  // Hard guard: X Layer mainnet (196) never uses a TapeOut stand-in or override.
  if (network === "xlayerMainnet") {
    const overrides = Object.keys(env).filter((k) => /^VITE_(JUDGE_)?TAPEOUT_/.test(k) && env[k]);
    if (overrides.length) throw new Error(`TapeOut overrides (${overrides.join(", ")}) are not allowed in a mainnet build.`);
    const dep = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../contracts/deployments.json"), "utf8")).networks?.xlayerMainnet;
    const official = { opener: "0x536add8f30f03b69f6fbf29d425a816a0dc50106", factory: "0x1f09daefa827f02cbb40967cc91b259763760761" };
    const t = dep?.tapeout;
    if (t && (t.standIn || String(t.opener).toLowerCase() !== official.opener || String(t.factory).toLowerCase() !== official.factory)) {
      throw new Error("contracts/deployments.json xlayerMainnet.tapeout is not the official TapeOut opener/factory; refusing a mainnet build.");
    }
  }

  return {
    base: "./",
    envDir,
    plugins: [react()],
    define: { __JUDGE_BUILD__: JSON.stringify(judgeBuild) },
    build: {
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: false,
      target: "es2020",
      assetsInlineLimit: 0,
      chunkSizeWarningLimit: 1500,
    },
    server: { port: 5173, strictPort: false },
    preview: { port: 4173 },
  };
});
