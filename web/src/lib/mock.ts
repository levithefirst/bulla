// Dev-only fixture data, used only when VITE_MOCK=1. Never shown in a normal build.
import type { Address, Hex } from "viem";
import type { InvoiceData, Milestone, TokenInfo } from "./invoice";

const now = BigInt(Math.floor(Date.now() / 1000));
export const MOCK_TOKEN: TokenInfo = { address: "0x000000000000000000000000000000000000c0de", symbol: "mUSDC", decimals: 6 };
const Z = "0x0000000000000000000000000000000000000000" as Address;
const H = "0x8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4" as Hex;
const ZH = "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;
const seller = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as Address;
const container = "0x000000000000000000000000000000000c0a1e00" as Address;
const base = {
  seller,
  buyer: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as Address,
  token: MOCK_TOKEN.address,
  arbiter: Z,
  processor: "0x00000000000000000000000000000000000ce001" as Address,
  circuitId: 1n,
  container,
  payToContainer: false,
  sellerCancelConsent: false,
  buyerCancelConsent: false,
  termsHash: ZH,
};
const m = (label: string, amount: bigint, state: number, extra: Partial<Milestone> = {}): Milestone => ({
  label,
  amount,
  state,
  deliveryHash: state >= 1 ? H : ZH,
  deliveryURI: "",
  submittedAt: state >= 1 ? now - 3600n : 0n,
  closedAt: state >= 2 ? now - 600n : 0n,
  paidTo: state === 2 ? seller : Z,
  ...extra,
});

export const MOCK_INVOICES: InvoiceData[] = [
  {
    invoice: { ...base, id: 1n, totalAmount: 250_000_000n, releasedAmount: 0n, refundedAmount: 0n, milestoneCount: 2, dueTimestamp: now + 7n * 86400n, createdAt: now - 3600n, fundedAt: 0n, closedAt: 0n, state: 1, memo: "Fixture: logo design" },
    milestones: [m("Logo concepts", 100_000_000n, 0), m("Final logo files", 150_000_000n, 0)],
    payoutTarget: seller,
    containerOpened: false,
  },
  {
    invoice: { ...base, id: 2n, payToContainer: true, arbiter: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" as Address, totalAmount: 1_200_000_000n, releasedAmount: 400_000_000n, refundedAmount: 0n, milestoneCount: 3, dueTimestamp: now + 2n * 86400n, createdAt: now - 5n * 86400n, fundedAt: now - 4n * 86400n, closedAt: 0n, state: 2, memo: "Fixture: landing page build" },
    milestones: [m("Wireframes", 400_000_000n, 2, { paidTo: container }), m("Build", 500_000_000n, 1, { deliveryURI: "https://example.com/delivery/landing-page.zip" }), m("Launch", 300_000_000n, 0)],
    payoutTarget: container,
    containerOpened: true,
  },
  {
    invoice: { ...base, id: 3n, totalAmount: 500_000_000n, releasedAmount: 500_000_000n, refundedAmount: 0n, milestoneCount: 1, dueTimestamp: now - 86400n, createdAt: now - 10n * 86400n, fundedAt: now - 9n * 86400n, closedAt: now - 4n * 86400n, state: 3, memo: "Fixture: brand guide (released)" },
    milestones: [m("Brand guide", 500_000_000n, 2)],
    payoutTarget: seller,
    containerOpened: false,
  },
];
