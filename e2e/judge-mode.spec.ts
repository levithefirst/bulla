import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { createPublicClient, http } from "viem";

/**
 * Judge-mode acceptance: landing -> one tap -> lock, submit, approve, release -> Released, with a
 * tx link per step, in under JUDGE_MAX_MS (default 10 s on the local auto-mining node).
 * Local CI: run by `npm run e2e` against the local node and a throwaway local gas tank.
 * Testnet: `npm run e2e:testnet` (E2E_RUNTIME_FILE=.runtime.testnet.json, explorer links required).
 */
const runtime = JSON.parse(fs.readFileSync(path.join(__dirname, process.env.E2E_RUNTIME_FILE ?? ".runtime.json"), "utf8"));
const TESTNET = runtime.mode === "testnet";
const MAX_MS = Number(process.env.JUDGE_MAX_MS ?? (TESTNET ? 60_000 : 10_000));

test.describe.configure({ mode: "serial" });

test(`judge mode: one tap from the landing page to Released in under ${MAX_MS / 1000} s`, async ({ page }) => {
  await page.goto("#/");
  const t0 = Date.now();
  await page.getByTestId("cta-try").click();

  const state = page.getByTestId("judge-state");
  await expect(state).toHaveText("Released", { timeout: MAX_MS });
  const wallMs = Date.now() - t0;
  // Each status was read from chain as it happened: Funded (locked) -> Submitted -> Released.
  await expect(page.getByTestId("judge-history")).toHaveText(/Draft.*Funded.*Submitted.*Released/);

  const elapsed = page.getByTestId("judge-elapsed");
  await expect(elapsed).toHaveAttribute("data-ms", /^\d+$/);
  const appMs = Number(await elapsed.getAttribute("data-ms"));
  console.log(`  judge-mode loop: ${appMs} ms in-app, ${wallMs} ms from the landing tap to Released (${TESTNET ? "X Layer testnet" : "local node"})`);
  fs.writeFileSync(path.join(__dirname, `.judge-timing${TESTNET ? ".testnet" : ""}.json`), JSON.stringify({ appMs, wallMs, at: new Date().toISOString() }));
  expect(wallMs).toBeLessThan(MAX_MS);

  // Every step is a real tx with a link (fresh browser => fresh burners => no skipped steps).
  for (const key of ["gasFreelancer", "gasClient", "mint", "approve", "create", "fund", "submit", "release"]) {
    const step = page.getByTestId(`step-${key}`);
    await expect(step).toHaveAttribute("data-status", "done");
    await expect(step.getByTestId("step-tx")).toContainText(/0x[0-9a-f]{4}/i);
  }
  if (TESTNET) {
    const hrefs = await page.getByTestId("step-tx").evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
    expect(hrefs).toHaveLength(8);
    for (const h of hrefs) expect(h).toMatch(/^https:\/\/www\.okx\.com\/web3\/explorer\/xlayer-test\/tx\/0x[0-9a-f]{64}$/);
  }

  // The public receipt for the demo invoice reads Released with no wallet.
  await page.getByTestId("judge-receipt-link").click();
  await expect(page.getByTestId("receipt")).toBeVisible();
  await expect(page.getByTestId("state")).toHaveText("Released");
  await expect(page.getByText("Demo escrow · DemoUSD, no value")).toBeVisible();
});

test("judge mode: an empty gas tank shows a clear message and sends nothing", async ({ browser }) => {
  test.skip(TESTNET, "only drained on the local node");
  const pub = createPublicClient({ transport: http(runtime.rpc) });
  const keys = JSON.parse(fs.readFileSync(path.join(__dirname, ".keys.json"), "utf8"));
  const before = await pub.getBalance({ address: keys.gasTank.address });
  await pub.request({ method: "hardhat_setBalance" as never, params: [keys.gasTank.address, "0x0"] as never });
  try {
    const page = await (await browser.newContext()).newPage(); // fresh burners need gas
    await page.goto("#/try");
    await page.getByTestId("judge-run").click();
    await expect(page.getByTestId("judge-tank-empty")).toContainText("Demo gas tank empty");
    await expect(page.getByTestId("step-tx")).toHaveCount(0);
    await expect(page.getByTestId("judge-state")).toHaveCount(0);
  } finally {
    await pub.request({ method: "hardhat_setBalance" as never, params: [keys.gasTank.address, `0x${before.toString(16)}`] as never });
  }
});

test("advanced path keeps the own-wallet flow", async ({ page }) => {
  await page.goto("#/try");
  await page.getByTestId("judge-advanced").click();
  await expect(page.getByTestId("create-form")).toBeVisible();
  await page.getByTestId("connect-wallet").click();
  await expect(page.getByTestId("connector-okxWallet")).toContainText("Recommended on X Layer");
});
