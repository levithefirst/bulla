/**
 * README screenshots from a real local chain (not mock data):
 *   npm run screenshots   ->  docs/screenshots/*.png (light + dark, desktop + 375px)
 * Seeds invoices with the throwaway local keys, then captures pages with Playwright.
 */
import * as fs from "fs";
import * as path from "path";
import { chromium } from "@playwright/test";
import { createPublicClient, createWalletClient, http, keccak256, maxUint256, pad, parseUnits, toBytes, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import { bullaEscrowAbi } from "../web/src/abi/bullaEscrow";
import { mockErc20Abi } from "../web/src/abi/mockErc20";
import { root, startLocalStack } from "./local-stack";

const OUT = path.join(root, "docs/screenshots");
const FIXTURE_CONTAINER = pad("0x00000000000000000000000000000000b0110a00", { size: 32 });

async function main() {
  const s = await startLocalStack({ rpcPort: 8547, webPort: 4175, outDir: "dist-shots", tag: "shots" });
  try {
    const pub = createPublicClient({ chain: hardhat, transport: http(s.rpc) });
    const wc = (k: Hex) => createWalletClient({ chain: hardhat, transport: http(s.rpc), account: privateKeyToAccount(k) });
    const seller = wc(s.keys.seller.privateKey);
    const buyer = wc(s.keys.buyer.privateKey);
    const send = async (p: Promise<Hex>) => pub.waitForTransactionReceipt({ hash: await p });
    const now = Number((await pub.getBlock()).timestamp);
    await send(buyer.writeContract({ address: s.token, abi: mockErc20Abi, functionName: "approve", args: [s.escrow, maxUint256] }));

    const create = (amount: string, days: number, memo: string) =>
      send(seller.writeContract({ address: s.escrow, abi: bullaEscrowAbi, functionName: "createInvoice", args: [s.keys.buyer.address as Address, s.token, parseUnits(amount, 6), BigInt(now + days * 86400), "0x" + "00".repeat(32) as Hex, FIXTURE_CONTAINER, memo] }));
    const act = (fn: "fundInvoice" | "releaseFunds", id: bigint) => send(buyer.writeContract({ address: s.escrow, abi: bullaEscrowAbi, functionName: fn, args: [id] }));
    const submit = (id: bigint, what: string, uri: string) => send(seller.writeContract({ address: s.escrow, abi: bullaEscrowAbi, functionName: "submitDelivery", args: [id, keccak256(toBytes(what)), uri] }));

    // #1 Submitted, #2 Released, #3 Draft
    await create("1200", 9, "Brand identity, milestone 2");
    await act("fundInvoice", 1n);
    await submit(1n, "brand-identity-v2.zip", "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi");
    await create("250", 5, "Logo design, milestone 1");
    await act("fundInvoice", 2n);
    await submit(2n, "logo-final.zip", "");
    await act("releaseFunds", 2n);
    await create("400", 14, "Landing page copy");

    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();
    const shots: [string, string, number, number][] = [
      ["landing", "#/", 1280, 860],
      ["create", "#/create", 1280, 1000],
      ["receipt-submitted", "#/invoice/1", 1280, 1180],
      ["receipt-released", "#/invoice/2", 1280, 1180],
      ["mobile-landing", "#/", 375, 812],
      ["mobile-receipt", "#/invoice/1", 375, 812],
    ];
    for (const scheme of ["light", "dark"] as const) {
      for (const [name, route, w, h] of shots) {
        const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: scheme });
        await page.goto(s.baseURL + route);
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => document.fonts.ready);
        if (route.startsWith("#/invoice")) await page.getByTestId("receipt").waitFor();
        await page.waitForTimeout(400);
        const file = path.join(OUT, `${name}-${scheme}.png`);
        await page.screenshot({ path: file });
        console.log(`[shots] ${path.relative(root, file)}`);
        await page.close();
      }
    }
    // Judge mode: one tap on the landing, captured once the loop reaches Released.
    for (const scheme of ["light", "dark"] as const) {
      for (const [name, w, h] of [["judge-mode", 1280, 1100], ["mobile-judge-mode", 375, 812]] as const) {
        const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: scheme });
        await page.goto(s.baseURL + "#/");
        await page.getByTestId("cta-try").click();
        await page.getByTestId("judge-state").filter({ hasText: "Released" }).waitFor({ timeout: 30_000 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        const file = path.join(OUT, `${name}-${scheme}.png`);
        await page.screenshot({ path: file });
        console.log(`[shots] ${path.relative(root, file)}`);
        await page.close();
      }
    }
    await browser.close();
  } finally {
    s.stop();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
