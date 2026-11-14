import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

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
