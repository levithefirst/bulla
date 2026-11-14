// Dev-only fixture data, used only when VITE_MOCK=1. Never shown in a normal build.
import type { Invoice, TokenInfo } from "./invoice";

const now = BigInt(Math.floor(Date.now() / 1000));
export const MOCK_TOKEN: TokenInfo = { address: "0x000000000000000000000000000000000000c0de", symbol: "mUSDC", decimals: 6 };
const FIXTURE_CONTAINER_ID = "0x00000000000000000000000000000000000000000000000000000000b0110a00" as const;
const base = {
  seller: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  buyer: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  token: MOCK_TOKEN.address,
  circuitContainerId: FIXTURE_CONTAINER_ID,
  sellerCancelConsent: false,
  buyerCancelConsent: false,
} as const;

export const MOCK_INVOICES: Invoice[] = [
  {
    ...base,
    id: 1n,
    totalAmount: 250_000_000n,
    deliveryHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    deliveryURI: "",
    dueTimestamp: now + 7n * 86400n,
    createdAt: now - 3600n,
    fundedAt: 0n,
    submittedAt: 0n,
    closedAt: 0n,
    state: 1,
    memo: "Fixture: logo design, milestone 1",
  },
  {
    ...base,
    id: 2n,
    totalAmount: 1_200_000_000n,
    deliveryHash: "0x8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
    deliveryURI: "https://example.com/delivery/landing-page.zip",
    dueTimestamp: now + 2n * 86400n,
    createdAt: now - 5n * 86400n,
    fundedAt: now - 4n * 86400n,
    submittedAt: now - 3600n,
    closedAt: 0n,
    state: 3,
    memo: "Fixture: landing page build",
  },
  {
    ...base,
    id: 3n,
    totalAmount: 500_000_000n,
    deliveryHash: "0x8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
    deliveryURI: "",
    dueTimestamp: now - 86400n,
    createdAt: now - 10n * 86400n,
    fundedAt: now - 9n * 86400n,
    submittedAt: now - 5n * 86400n,
    closedAt: now - 4n * 86400n,
    state: 4,
    memo: "Fixture: brand guide (released)",
  },
];
