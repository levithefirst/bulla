/**
 * README screenshots from a real local chain (not mock data):
 *   npm run screenshots   ->  docs/screenshots/*.png (light + dark, desktop + 375px)
 * Seeds invoices with the throwaway local keys, then captures pages with Playwright.
 */
import * as fs from "fs";
import * as path from "path";
import { chromium } from "@playwright/test";
import { createPublicClient, createWalletClient, http, keccak256, maxUint256, parseUnits, toBytes, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import { bullaEscrowAbi } from "../web/src/abi/bullaEscrow";
import { mockErc20Abi } from "../web/src/abi/mockErc20";
import { root, startLocalStack } from "./local-stack";

const OUT = path.join(root, "docs/screenshots");

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

    const Z = "0x0000000000000000000000000000000000000000" as Address;
    const create = (ms: [string, string][], days: number, memo: string, payToContainer: boolean, arbiter: Address = Z) =>
      send(
        seller.writeContract({
          address: s.escrow,
          abi: bullaEscrowAbi,
          functionName: "createInvoice",
          args: [
            {
              buyer: s.keys.buyer.address as Address,
              token: s.token,
              amounts: ms.map(([, a]) => parseUnits(a, 6)),
              labels: ms.map(([l]) => l),
              dueTimestamp: BigInt(now + days * 86400),
              processor: s.tapeout.processor,
              circuitId: 1n,
              payToContainer,
              arbiter,
              termsHash: ("0x" + "00".repeat(32)) as Hex,
              memo,
            },
          ],
        }),
      );
    const fund = (id: bigint, arbiter: Address = Z) => send(buyer.writeContract({ address: s.escrow, abi: bullaEscrowAbi, functionName: "fundInvoice", args: [id, arbiter] }));
    const release = (id: bigint, i: bigint) => send(buyer.writeContract({ address: s.escrow, abi: bullaEscrowAbi, functionName: "releaseMilestone", args: [id, i] }));
    const submit = (id: bigint, i: bigint, what: string, uri: string) => send(seller.writeContract({ address: s.escrow, abi: bullaEscrowAbi, functionName: "submitMilestone", args: [id, i, keccak256(toBytes(what)), uri] }));
    const arb = s.keys.deployer.address as Address;

    // Open the stand-in container so invoice #1 pays into it (an unopened container falls back to the holder).
    await send(
      seller.writeContract({
        address: s.tapeout.opener,
        abi: [{ type: "function", name: "open", stateMutability: "nonpayable", inputs: [{ name: "c", type: "address" }, { name: "t", type: "uint256" }], outputs: [{ name: "", type: "address" }] }] as const,
        functionName: "open",
        args: [s.tapeout.processor, 1n],
      }),
    );

    // #1 three milestones into the container, one released, one submitted, arbiter set
    await create([["Wireframes", "400"], ["Build", "500"], ["Launch", "300"]], 9, "Brand identity and landing page", true, arb);
    await fund(1n, arb);
    await submit(1n, 0n, "wireframes.fig", "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi");
    await release(1n, 0n);
    await submit(1n, 1n, "build.zip", "");
    // #2 fully released, paid to the circuit holder
    await create([["Logo concepts", "100"], ["Final logo files", "150"]], 5, "Logo design", false);
    await fund(2n);
    await submit(2n, 0n, "concepts.pdf", "");
    await release(2n, 0n);
    await submit(2n, 1n, "logo-final.zip", "");
    await release(2n, 1n);
    // #3 draft
    await create([["Landing page copy", "400"]], 14, "Landing page copy", false);

    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();
    const shots: [string, string, number, number][] = [
      ["landing", "#/", 1280, 860],
      ["create", "#/create", 1280, 1300],
      ["receipt-submitted", "#/invoice/1", 1280, 1400],
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
