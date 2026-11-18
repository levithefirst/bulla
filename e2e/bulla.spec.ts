import { test, expect, type Browser, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { createPublicClient, createWalletClient, http, erc20Abi, type Hex, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import { injectWallet } from "./wallet";

const runtime = JSON.parse(fs.readFileSync(path.join(__dirname, ".runtime.json"), "utf8"));
const keys = JSON.parse(fs.readFileSync(path.join(__dirname, ".keys.json"), "utf8"));
const pub = createPublicClient({ chain: hardhat, transport: http(runtime.rpc) });

const bal = (who: Address) => pub.readContract({ address: runtime.token, abi: erc20Abi, functionName: "balanceOf", args: [who] });

async function walletPage(browser: Browser, role: "seller" | "buyer"): Promise<Page> {
  const context = await browser.newContext();
  await injectWallet(context, keys[role].privateKey as Hex, runtime.rpc);
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`[${role} pageerror]`, e.message));
  return page;
}

async function connect(page: Page) {
  await page.getByTestId("connect-wallet").click();
  await page.getByTestId("connector-injected").click();
  await expect(page.getByTestId("connected-address")).toBeVisible();
}

async function chainNow(): Promise<number> {
  return Number((await pub.getBlock({ blockTag: "latest" })).timestamp);
}

/** Format a unix timestamp as a datetime-local value in the page's timezone. */
async function localInput(page: Page, ts: number) {
  return page.evaluate((t) => {
    const d = new Date(t * 1000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }, ts);
}

async function createInvoice(
  seller: Page,
  amount: string,
  dueTs: number,
  memo: string,
  opts: { milestones?: { label: string; amount: string }[]; payToContainer?: boolean; arbiter?: string } = {},
): Promise<string> {
  await seller.goto("#/create");
  await connect(seller);
  await seller.locator('input[name="buyer"]').fill(keys.buyer.address);
  const ms = opts.milestones ?? [{ label: "Logo", amount }];
  for (let i = 0; i < ms.length; i++) {
    if (i > 0) await seller.getByTestId("add-milestone").click();
    await seller.locator(`input[name="label-${i}"]`).fill(ms[i].label);
    await seller.locator(`input[name="amount-${i}"]`).fill(ms[i].amount);
  }
  await seller.locator('input[name="due"]').fill(await localInput(seller, dueTs));
  // The local stack minted stand-in circuit #1 to the seller key; the processor is prefilled.
  await expect(seller.getByTestId("standin-label")).toBeVisible();
  await seller.locator('input[name="circuitId"]').fill("1");
  await expect(seller.getByTestId("circuit-ok")).toHaveText("You hold circuit #1");
  await expect(seller.getByTestId("container-address")).toHaveText(/^0x[0-9a-fA-F]{40}$/);
  if (opts.payToContainer) await seller.getByTestId("pay-to-container").check();
  await expect(seller.getByTestId("warn-no-arbiter")).toBeVisible();
  if (opts.arbiter) {
    await seller.locator('input[name="arbiter"]').fill(opts.arbiter);
    await expect(seller.getByTestId("warn-no-arbiter")).toHaveCount(0);
  }
  await seller.locator('input[name="memo"]').fill(memo);
  await expect(seller.getByTestId("warn-unaudited")).toBeVisible();
  await expect(seller.getByTestId("warn-circuit-holder")).toBeVisible();
  await seller.getByTestId("create-submit").click();
  await seller.waitForURL(/#\/invoice\/\d+$/);
  const id = seller.url().match(/#\/invoice\/(\d+)$/)![1];
  await expect(seller.getByTestId("state")).toHaveText("Draft");
  return id;
}

async function fundAsBuyer(buyer: Page, id: string, acceptArbiter = false) {
  await buyer.goto(`#/invoice/${id}`);
  await connect(buyer);
  const panel = buyer.getByTestId("fund-panel");
  await expect(panel).toBeVisible();
  if (acceptArbiter) await panel.getByTestId("arbiter-accept").locator("input").check();
  await expect(panel.getByTestId("warn-unaudited")).toBeVisible();
  await expect(panel.getByTestId("warn-circuit-holder")).toBeVisible();
  await buyer.getByTestId("approve-btn").click();
  await expect(buyer.getByTestId("fund-btn")).toBeEnabled();
  await buyer.getByTestId("fund-btn").click();
  await expect(buyer.getByTestId("state")).toHaveText("Funded");
}

test.describe.configure({ mode: "serial" });

test("receipt renders with no wallet", async ({ page }) => {
  // Seed one invoice directly is not possible without a key in the page, so create via UI in the next tests;
  // here we check the empty/unknown and landing paths with no wallet at all.
  await page.goto("#/");
  await expect(page.getByTestId("cta-create")).toBeVisible();
  await page.goto("#/invoice/999");
  await expect(page.getByTestId("receipt-error")).toContainText("does not exist");
});

test("happy path: create -> fund -> submit -> release", async ({ browser }) => {
  const seller = await walletPage(browser, "seller");
  const buyer = await walletPage(browser, "buyer");
  const sellerBefore = await bal(keys.seller.address);
  const feeBefore = await bal(keys.feeRecipient.address);

  const id = await createInvoice(seller, "250", (await chainNow()) + 7 * 86400, "E2E logo design");
  console.log(`  created invoice #${id}`);

  // Public receipt with no wallet
  const anon = await (await browser.newContext()).newPage();
  await anon.goto(`#/invoice/${id}`);
  await expect(anon.getByTestId("receipt")).toBeVisible();
  await expect(anon.getByTestId("amount")).toHaveText("250 mUSDC");
  await expect(anon.getByTestId("fee")).toHaveText("1.25 mUSDC");
  await expect(anon.getByTestId("actions-connect")).toBeVisible();
  await expect(anon.locator(".share svg.qr")).toBeVisible();
  await expect(anon.getByTestId("copy-link")).toBeVisible();
  await expect(anon.getByTestId("container-address")).toHaveText(/^0x[0-9a-fA-F]{40}$/);
  await expect(anon.getByTestId("payout-target")).toHaveText(keys.seller.address);
  await expect(anon.getByTestId("share-x")).toHaveAttribute("href", /^https:\/\/twitter\.com\/intent\/tweet\?text=/);
  await expect(anon.getByTestId("share-telegram")).toHaveAttribute("href", /^https:\/\/t\.me\/share\/url\?url=/);
  await expect(anon.getByTestId("state").locator("..")).toHaveAttribute("data-status", "pending");

  await fundAsBuyer(buyer, id);

  await seller.reload();
  await expect(seller.getByTestId("state")).toHaveText("Funded");
  await seller.getByTestId("open-submit-0").click();
  await seller.getByTestId("delivery-hash").fill("logo-final-v3.zip");
  await seller.getByTestId("delivery-uri").fill("ipfs://bafy-e2e-example");
  await seller.getByTestId("submit-delivery").click();
  await expect(seller.getByTestId("state")).toHaveText("Submitted");
  await expect(seller.getByTestId("delivery-hash-value-0")).toHaveText(/^0x[0-9a-f]{64}$/);

  await buyer.reload();
  await expect(buyer.getByTestId("state")).toHaveText("Submitted");
  const rel = buyer.getByTestId("release-panel-0");
  await expect(rel.getByTestId("release-fee-0")).toHaveText("1.25 mUSDC");
  await expect(rel.getByTestId("release-net-0")).toHaveText("248.75 mUSDC");
  await expect(buyer.getByTestId("fund-panel")).toHaveCount(0);
  await buyer.getByTestId("release-btn-0").click();
  await expect(rel.getByTestId("warn-unaudited")).toBeVisible();
  await expect(rel.getByTestId("payee-line")).toContainText("circuit holder");
  await buyer.getByTestId("release-confirm-0").click();
  await expect(buyer.getByTestId("state")).toHaveText("Released");

  expect((await bal(keys.seller.address)) - sellerBefore).toBe(248_750_000n);
  expect((await bal(keys.feeRecipient.address)) - feeBefore).toBe(1_250_000n);

  // Seller has no actions on a closed invoice; a stranger wallet sees none either.
  await anon.reload();
  await expect(anon.getByTestId("state")).toHaveText("Released");
  await expect(anon.getByTestId("timeline")).toContainText("Every milestone released");
  await expect(anon.getByTestId("ms-state-0")).toHaveText("Released");
  await expect(anon.getByTestId("history-released")).not.toHaveText("0");
});

test("timeout refund: create -> fund -> wait past due -> refund", async ({ browser }) => {
  const seller = await walletPage(browser, "seller");
  const buyer = await walletPage(browser, "buyer");

  const id = await createInvoice(seller, "100", (await chainNow()) + 3600, "E2E refund path");
  await fundAsBuyer(buyer, id);
  const buyerBefore = await bal(keys.buyer.address);

  // Before due: no refund button, release still offered.
  await expect(buyer.getByTestId("refund-panel")).toHaveCount(0);
  await expect(buyer.getByTestId("release-panel-0")).toBeVisible();

  await pub.request({ method: "evm_increaseTime" as never, params: [7200] as never });
  await pub.request({ method: "evm_mine" as never, params: [] as never });

  await buyer.reload();
  await expect(buyer.getByTestId("refund-panel")).toBeVisible();
  await buyer.getByTestId("refund-btn").click();
  await expect(buyer.getByTestId("state")).toHaveText("Refunded");
  expect((await bal(keys.buyer.address)) - buyerBefore).toBe(100_000_000n);

  // Seller cannot submit after due and sees a closed invoice now.
  await seller.reload();
  await expect(seller.getByTestId("state")).toHaveText("Refunded");
});

test("mutual cancel after funding refunds buyer", async ({ browser }) => {
  const seller = await walletPage(browser, "seller");
  const buyer = await walletPage(browser, "buyer");
  const id = await createInvoice(seller, "40", (await chainNow()) + 86400, "E2E cancel path");
  await fundAsBuyer(buyer, id);
  const before = await bal(keys.buyer.address);

  await seller.reload();
  await expect(seller.getByTestId("warn-no-arbiter")).toBeVisible();
  await seller.getByTestId("cancel-btn").click();
  await expect(seller.getByTestId("cancel-waiting")).toBeVisible();
  // Withdraw consent, then give it again: the revoke path works from the UI.
  await seller.getByTestId("cancel-revoke").click();
  await expect(seller.getByTestId("cancel-btn")).toContainText("Consent to cancel");
  await seller.getByTestId("cancel-btn").click();
  await expect(seller.getByTestId("cancel-waiting")).toBeVisible();
  await buyer.reload();
  await expect(buyer.getByTestId("cancel-btn")).toContainText("Confirm cancel");
  await buyer.getByTestId("cancel-btn").click();
  await expect(buyer.getByTestId("state")).toHaveText("Cancelled");
  await expect(buyer.getByTestId("state").locator("..")).toHaveAttribute("data-status", "neutral");
  expect((await bal(keys.buyer.address)) - before).toBe(40_000_000n);
});

test("parsed revert reason is shown, not a fake success", async ({ browser }) => {
  const seller = await walletPage(browser, "seller");
  await seller.goto("#/create");
  await connect(seller);
  await seller.locator('input[name="buyer"]').fill(keys.buyer.address);
  await seller.locator('input[name="label-0"]').fill("Tiny");
  await seller.locator('input[name="amount-0"]').fill("1");
  await seller.locator('input[name="due"]').fill(await localInput(seller, (await chainNow()) + 600));
  await seller.locator('input[name="circuitId"]').fill("1");
  await expect(seller.getByTestId("circuit-ok")).toBeVisible();
  // Advance chain time after form validation would pass: the contract must reject with DueInPast.
  await pub.request({ method: "evm_increaseTime" as never, params: [3600] as never });
  await pub.request({ method: "evm_mine" as never, params: [] as never });
  await seller.getByTestId("create-submit").click();
  await expect(seller.getByTestId("toast-error").first()).toContainText(/DueInPast/);
  await expect(seller.getByTestId("toast-success")).toHaveCount(0);
  await expect(seller).toHaveURL(/#\/create/);
});

test("two milestones paid into the TapeOut container, buyer release + arbiter refund", async ({ browser }) => {
  const seller = await walletPage(browser, "seller");
  const buyer = await walletPage(browser, "buyer");
  const arbiterCtx = await browser.newContext();
  await injectWallet(arbiterCtx, keys.deployer.privateKey as Hex, runtime.rpc);
  const arbiter = await arbiterCtx.newPage();

  const id = await createInvoice(seller, "", (await chainNow()) + 7 * 86400, "E2E two milestones", {
    milestones: [
      { label: "Wireframes", amount: "40" },
      { label: "Final build", amount: "60" },
    ],
    payToContainer: true,
    arbiter: keys.deployer.address,
  });
  const container = (await seller.getByTestId("container-address").first().textContent())!.trim() as Address;
  // Container not opened yet: the contract falls back to paying the circuit holder.
  await expect(seller.getByTestId("container-opened").first()).toHaveText("Not opened");
  await expect(seller.getByTestId("payout-target")).toHaveText(keys.seller.address);
  await expect(seller.getByTestId("payout-note")).toContainText("not opened yet");
  await expect(seller.getByTestId("withdraw-note")).toBeVisible();
  // Open the stand-in container (on mainnet: the official app, 0.08 OKB), then payouts go to the container.
  const opener = createWalletClient({ chain: hardhat, transport: http(runtime.rpc), account: privateKeyToAccount(keys.seller.privateKey as Hex) });
  const openHash = await opener.writeContract({
    address: runtime.tapeout.opener,
    abi: [{ type: "function", name: "open", stateMutability: "nonpayable", inputs: [{ name: "c", type: "address" }, { name: "t", type: "uint256" }], outputs: [{ name: "", type: "address" }] }],
    functionName: "open",
    args: [runtime.tapeout.processor, 1n],
  });
  await pub.waitForTransactionReceipt({ hash: openHash });
  await seller.reload();
  await expect(seller.getByTestId("container-opened").first()).toHaveText("Opened");
  await expect(seller.getByTestId("payout-target")).toHaveText(container);
  await expect(seller.getByTestId("arbiter")).toContainText(keys.deployer.address);
  const containerBefore = await bal(container);

  await fundAsBuyer(buyer, id, true);
  await seller.reload();
  await seller.getByTestId("open-submit-0").click();
  await seller.getByTestId("delivery-hash").fill("wireframes.fig");
  await seller.getByTestId("submit-delivery").click();
  await expect(seller.getByTestId("ms-state-0")).toHaveText("Submitted");

  await buyer.reload();
  await buyer.getByTestId("release-btn-0").click();
  await expect(buyer.getByTestId("payee-line").first()).toContainText("TapeOut container");
  await buyer.getByTestId("release-confirm-0").click();
  await expect(buyer.getByTestId("ms-state-0")).toHaveText("Released");
  await expect(buyer.getByTestId("state")).toHaveText("Partly released");
  expect((await bal(container)) - containerBefore).toBe(39_800_000n); // 40 minus 0.5%

  await seller.reload();
  await seller.getByTestId("open-submit-1").click();
  await seller.getByTestId("delivery-hash").fill("build.zip");
  await seller.getByTestId("submit-delivery").click();
  await expect(seller.getByTestId("ms-state-1")).toHaveText("Submitted");

  const buyerBefore = await bal(keys.buyer.address);
  await arbiter.goto(`#/invoice/${id}`);
  await connect(arbiter);
  await expect(arbiter.getByTestId("actions-arbiter")).toBeVisible();
  await arbiter.getByTestId("arbiter-refund-1").click();
  await expect(arbiter.getByTestId("ms-state-1")).toHaveText("Refunded");
  await expect(arbiter.getByTestId("state")).toHaveText("Completed");
  expect((await bal(keys.buyer.address)) - buyerBefore).toBe(60_000_000n);
  await expect(arbiter.getByTestId("history-released")).not.toHaveText("0");
  await expect(arbiter.getByTestId("seller-history").getByRole("heading")).toHaveText("On-chain activity");
});

test("responsive at 375px and keyboard skip link, no wallet", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  for (const route of ["#/", "#/create", "#/invoice/1"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(0);
  }
  await expect(page.getByTestId("receipt")).toBeVisible();
  // In-app navigation moves focus to <main> for keyboard and screen-reader users.
  await expect(page.locator("#main")).toBeFocused();
  // On a fresh page load the first Tab lands on the skip link.
  await page.reload();
  await page.getByTestId("receipt").waitFor();
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
});
