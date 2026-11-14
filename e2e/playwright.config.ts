import { defineConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const runtimePath = path.resolve(__dirname, process.env.E2E_RUNTIME_FILE ?? ".runtime.json");
const runtime = fs.existsSync(runtimePath) ? JSON.parse(fs.readFileSync(runtimePath, "utf8")) : { baseURL: "http://127.0.0.1:4174/" };

export default defineConfig({
  testDir: __dirname,
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  use: { baseURL: runtime.baseURL, trace: "off", screenshot: "only-on-failure", viewport: { width: 1280, height: 900 } },
});
