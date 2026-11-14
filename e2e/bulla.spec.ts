import { test, expect, type Browser, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { createPublicClient, http, erc20Abi, type Hex, type Address } from "viem";
import { hardhat } from "viem/chains";
import { injectWallet } from "./wallet";

const runtime = JSON.parse(fs.readFileSync(path.join(__dirname, ".runtime.json"), "utf8"));
const keys = JSON.parse(fs.readFileSync(path.join(__dirname, ".keys.json"), "utf8"));
const pub = createPublicClient({ chain: hardhat, transport: http(runtime.rpc) });
const FIXTURE_CONTAINER = "0x00000000000000000000000000000000b0110a00"; // local fixture, not a real TapeOut container

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

async function createInvoice(seller: Page, amount: string, dueTs: number, memo: string): Promise<string> {
  await seller.goto("#/create");
  await connect(seller);
  await seller.locator('input[name="buyer"]').fill(keys.buyer.address);
  await seller.locator('input[name="amount"]').fill(amount);
  await seller.locator('input[name="due"]').fill(await localInput(seller, dueTs));
  await seller.locator('input[name="container"]').fill(FIXTURE_CONTAINER);
  await seller.locator('input[name="memo"]').fill(memo);
  await expect(seller.getByTestId("warn-unaudited")).toBeVisible();
  await expect(seller.getByTestId("warn-circuit-holder")).toBeVisible();
  await seller.getByTestId("create-submit").click();
  await seller.waitForURL(/#\/invoice\/\d+$/);
  const id = seller.url().match(/#\/invoice\/(\d+)$/)![1];
  await expect(seller.getByTestId("state")).toHaveText("Draft");
  return id;
}

async function fundAsBuyer(buyer: Page, id: string) {
  await buyer.goto(`#/invoice/${id}`);
  await connect(buyer);
  const panel = buyer.getByTestId("fund-panel");
  await expect(panel).toBeVisible();
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

  await fundAsBuyer(buyer, id);

  await seller.reload();
  await expect(seller.getByTestId("state")).toHaveText("Funded");
  await seller.getByTestId("open-submit").click();
  await seller.getByTestId("delivery-hash").fill("logo-final-v3.zip");
  await seller.getByTestId("delivery-uri").fill("ipfs://bafy-e2e-example");
  await seller.getByTestId("submit-delivery").click();
  await expect(seller.getByTestId("state")).toHaveText("Submitted");
  await expect(seller.getByTestId("delivery-hash-value")).toHaveText(/^0x[0-9a-f]{64}$/);

  await buyer.reload();
  await expect(buyer.getByTestId("state")).toHaveText("Submitted");
  const rel = buyer.getByTestId("release-panel");
  await expect(rel.getByTestId("release-fee")).toHaveText("1.25 mUSDC");
  await expect(rel.getByTestId("release-net")).toHaveText("248.75 mUSDC");
  await expect(rel.getByTestId("warn-unaudited")).toBeVisible();
  await expect(rel.getByTestId("warn-circuit-holder")).toBeVisible();
  await buyer.getByTestId("release-btn").click();
  await buyer.getByTestId("release-confirm").click();
  await expect(buyer.getByTestId("state")).toHaveText("Released");

  expect((await bal(keys.seller.address)) - sellerBefore).toBe(248_750_000n);
  expect((await bal(keys.feeRecipient.address)) - feeBefore).toBe(1_250_000n);

  // Seller has no actions on a closed invoice; a stranger wallet sees none either.
  await anon.reload();
  await expect(anon.getByTestId("state")).toHaveText("Released");
  await expect(anon.getByTestId("timeline")).toContainText("Released to seller");
});

test("timeout refund: create -> fund -> wait past due -> refund", async ({ browser }) => {
  const seller = await walletPage(browser, "seller");
  const buyer = await walletPage(browser, "buyer");

  const id = await createInvoice(seller, "100", (await chainNow()) + 3600, "E2E refund path");
  await fundAsBuyer(buyer, id);
  const buyerBefore = await bal(keys.buyer.address);

  // Before due: no refund button, release still offered.
  await expect(buyer.getByTestId("refund-panel")).toHaveCount(0);
  await expect(buyer.getByTestId("release-panel")).toBeVisible();

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
  await seller.getByTestId("cancel-btn").click();
  await expect(seller.getByTestId("cancel-waiting")).toBeVisible();
  await buyer.reload();
  await expect(buyer.getByTestId("cancel-btn")).toContainText("Confirm cancel");
  await buyer.getByTestId("cancel-btn").click();
  await expect(buyer.getByTestId("state")).toHaveText("Cancelled");
  expect((await bal(keys.buyer.address)) - before).toBe(40_000_000n);
});

test("parsed revert reason is shown, not a fake success", async ({ browser }) => {
  const seller = await walletPage(browser, "seller");
  await seller.goto("#/create");
  await connect(seller);
  await seller.locator('input[name="buyer"]').fill(keys.buyer.address);
  await seller.locator('input[name="amount"]').fill("1");
  await seller.locator('input[name="due"]').fill(await localInput(seller, (await chainNow()) + 600));
  await seller.locator('input[name="container"]').fill(FIXTURE_CONTAINER);
  // Advance chain time after form validation would pass: the contract must reject with DueInPast.
  await pub.request({ method: "evm_increaseTime" as never, params: [3600] as never });
  await pub.request({ method: "evm_mine" as never, params: [] as never });
  await seller.getByTestId("create-submit").click();
  await expect(seller.getByTestId("toast-error").first()).toContainText(/DueInPast/);
  await expect(seller.getByTestId("toast-success")).toHaveCount(0);
  await expect(seller).toHaveURL(/#\/create/);
});
