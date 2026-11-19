import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { createPublicClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

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
  // The payout lands in the stand-in TapeOut container of the circuit the Freelancer minted.
  await expect(page.getByTestId("judge-container")).toContainText("Testnet stand-in for TapeOut");
  await expect(page.getByTestId("judge-container-received")).toHaveText("Container received 248.75 DemoUSD");
  await expect(page.getByTestId("tank-balance")).toHaveText(/^\d/);

  const elapsed = page.getByTestId("judge-elapsed");
  await expect(elapsed).toHaveAttribute("data-ms", /^\d+$/);
  const appMs = Number(await elapsed.getAttribute("data-ms"));
  console.log(`  judge-mode loop: ${appMs} ms in-app, ${wallMs} ms from the landing tap to Released (${TESTNET ? "X Layer testnet" : "local node"})`);
  fs.writeFileSync(path.join(__dirname, `.judge-timing${TESTNET ? ".testnet" : ""}.json`), JSON.stringify({ appMs, wallMs, at: new Date().toISOString() }));
  expect(wallMs).toBeLessThan(MAX_MS);

  // Every step is a real tx with a link (fresh browser => fresh burners => no skipped steps).
  for (const key of ["gasFreelancer", "gasClient", "circuit", "open", "mint", "approve", "create", "fund", "submit0", "submit1", "release0", "release1"]) {
    const step = page.getByTestId(`step-${key}`);
    await expect(step).toHaveAttribute("data-status", "done");
    await expect(step.getByTestId("step-tx")).toContainText(/0x[0-9a-f]{4}/i);
  }
  if (TESTNET) {
    await expect(page.getByTestId("step-explorer").first()).toHaveText("OKLink (index lags)");
    const hrefs = await page.getByTestId("step-explorer").evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
    expect(hrefs).toHaveLength(12);
    for (const h of hrefs) expect(h).toMatch(/^https:\/\/www\.oklink\.com\/x-layer-testnet\/tx\/0x[0-9a-f]{64}$/);
  }

  // Primary per-step link: the app's own receipt page, read from the RPC.
  const rpcLinks = await page.getByTestId("step-rpc-link").evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute("href")));
  expect(rpcLinks).toHaveLength(12);
  for (const h of rpcLinks) expect(h).toMatch(/^#\/tx\/0x[0-9a-f]{64}$/);

  // In-app receipts read from the RPC (the testnet explorer can lag): expand the final release.
  const last = page.getByTestId("step-release1");
  await last.getByTestId("step-receipt").locator("summary").click();
  await expect(last.getByTestId("receipt-status")).toHaveText("Success");
  await expect(last.getByTestId("receipt-block")).toHaveText(/^\d+$/);
  await expect(last.getByTestId("receipt-gas")).toHaveText(/^[\d,]+$/);
  await expect(page.getByTestId("step-copy-hash")).toHaveCount(12);

  // The public receipt for the demo invoice reads Released with no wallet.
  await page.getByTestId("judge-receipt-link").click();
  await expect(page.getByTestId("receipt")).toBeVisible();
  await expect(page.getByTestId("state")).toHaveText("Released");
  await expect(page.getByText("Demo escrow · DemoUSD, no value")).toBeVisible();
  await expect(page.getByTestId("ms-state-0")).toHaveText("Released");
  await expect(page.getByTestId("ms-state-1")).toHaveText("Released");
  await expect(page.getByTestId("standin-label")).toBeVisible();
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

const STEP_KEYS = ["gasFreelancer", "gasClient", "circuit", "open", "mint", "approve", "create", "fund", "submit0", "submit1", "release0", "release1"];

test("judge mode: a double tap on Run starts exactly one run (12 confirmed steps, no error)", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage(); // fresh burners: every step is a real tx
  await page.goto("#/try");
  const run = page.getByTestId("judge-run");
  await run.dblclick();
  // Extra taps in the same frame, and after the first render: all ignored while a run is active.
  await page.evaluate(() => {
    const b = document.querySelector('[data-testid="judge-run"]') as HTMLButtonElement;
    b.click();
    b.click();
  });
  await expect(run).toHaveText(/^(Running|Finishing)…$/);
  await expect(run).toBeDisabled();
  await expect(page.getByTestId("judge-state")).toHaveText("Released", { timeout: MAX_MS });
  await expect(page.getByTestId("judge-elapsed")).toHaveAttribute("data-ms", /^\d+$/);
  for (const key of STEP_KEYS) await expect(page.getByTestId(`step-${key}`)).toHaveAttribute("data-status", "done");
  await expect(page.getByTestId("step-tx")).toHaveCount(12);
  await expect(page.getByTestId("judge-error")).toHaveCount(0);
  await expect(page.getByTestId("judge-container-received")).toHaveText("Container received 248.75 DemoUSD");
  await expect(run).toHaveText("Run it again");
});

test("judge mode: tapping 'Run it again' twice quickly runs once, with fresh nonces and no error", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("#/try");
  const run = page.getByTestId("judge-run");
  await run.click();
  await expect(page.getByTestId("judge-state")).toHaveText("Released", { timeout: MAX_MS });
  await expect(run).toHaveText("Run it again");
  await run.dblclick();
  await expect(run).toBeDisabled();
  await expect(page.getByTestId("judge-elapsed")).toHaveAttribute("data-ms", /^\d+$/, { timeout: MAX_MS });
  await expect(page.getByTestId("judge-state")).toHaveText("Released");
  // Second run reuses the wallets: each step is either confirmed or skipped (already has gas / DemoUSD / allowance), none failed.
  for (const key of STEP_KEYS) await expect(page.getByTestId(`step-${key}`)).toHaveAttribute("data-status", /^(done|skipped)$/);
  expect(await page.getByTestId("step-tx").count()).toBeGreaterThanOrEqual(9);
  await expect(page.getByTestId("judge-error")).toHaveCount(0);
});

test("judge mode: a second tab with the same demo wallets is refused while another tab runs", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("#/try");
  await expect(page.getByTestId("judge-run")).toBeEnabled(); // the page is mounted, so the demo wallets exist
  const freelancerKey = await page.evaluate(() => JSON.parse(localStorage.getItem("bulla.demo-only.testnet-burners.v1") ?? "{}").freelancer as string);
  const lockKey = `bulla.judge.lock.${privateKeyToAccount(freelancerKey as Hex).address.toLowerCase()}`;
  // Another tab holds a fresh lease for these wallets.
  await page.evaluate(([k]) => localStorage.setItem(k, JSON.stringify({ owner: "other-tab", ts: Date.now() })), [lockKey]);
  await page.getByTestId("judge-run").click();
  await expect(page.getByTestId("judge-error")).toHaveText("A demo is already running in another tab.");
  await expect(page.getByTestId("step-tx")).toHaveCount(0);
  await expect(page.getByTestId("judge-run")).toBeEnabled();
  // The other tab finishes (lease released): this tab can run, and releases its own lease afterwards.
  await page.evaluate(([k]) => localStorage.removeItem(k), [lockKey]);
  await page.getByTestId("judge-run").click();
  await expect(page.getByTestId("judge-state")).toHaveText("Released", { timeout: MAX_MS });
  await expect(page.getByTestId("judge-error")).toHaveCount(0);
  await expect.poll(() => page.evaluate(([k]) => localStorage.getItem(k), [lockKey])).toBeNull(); // released when the run returns
});
