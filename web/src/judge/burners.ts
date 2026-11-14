/**
 * Judge-mode burner keys. DEMO ONLY: two throwaway keys generated in this browser for
 * X Layer TESTNET, stored in localStorage under a clearly labelled key. They never leave the
 * browser and hold only valueless DemoUSD and a few cents of testnet OKB.
 */
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";

export type Role = "freelancer" | "client";
export type Burner = { role: Role; address: Address; privateKey: Hex };
export type Burners = Record<Role, Burner>;

const KEY = "bulla.demo-only.testnet-burners.v1";
let memory: Burners | null = null;

function make(role: Role): Burner {
  const privateKey = generatePrivateKey();
  return { role, privateKey, address: privateKeyToAccount(privateKey).address };
}

function save(b: Burners) {
  memory = b;
  try {
    localStorage.setItem(KEY, JSON.stringify({ label: "DEMO ONLY: X Layer testnet throwaway keys. No real funds. Safe to delete.", freelancer: b.freelancer.privateKey, client: b.client.privateKey }));
  } catch {
    /* private mode: keep in memory for this page view */
  }
}

export function loadBurners(): Burners {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const j = JSON.parse(raw) as { freelancer: Hex; client: Hex };
      const b: Burners = {
        freelancer: { role: "freelancer", privateKey: j.freelancer, address: privateKeyToAccount(j.freelancer).address },
        client: { role: "client", privateKey: j.client, address: privateKeyToAccount(j.client).address },
      };
      memory = b;
      return b;
    }
  } catch {
    /* corrupt or unavailable: make new ones */
  }
  const b = { freelancer: make("freelancer"), client: make("client") };
  save(b);
  return b;
}

export function newBurners(): Burners {
  const b = { freelancer: make("freelancer"), client: make("client") };
  save(b);
  return b;
}
