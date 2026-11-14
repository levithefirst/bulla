import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Static export for DeWEB (TapeOut SiteRegistry) and any plain static host:
// - base "./" so every asset URL is relative (TapeKit handbook §2: relative paths only)
// - hash routing in the app, so no server rewrites are needed
// - no source maps, no external CDNs, no image optimizer service
export default defineConfig({
  base: "./",
  envDir: path.resolve(__dirname, ".."),
  plugins: [react()],
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
});
