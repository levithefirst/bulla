import { expect } from "chai";
import { ethers, network } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Fuzz + invariant tests (stateful random walk, seeded and reproducible).
 *   FUZZ_RUNS=8 FUZZ_STEPS=150 FUZZ_SEED=42 npx hardhat test test/BullaEscrow.invariants.test.ts
 * Invariants checked after EVERY step:
 *   I1  token.balanceOf(escrow) == totalHeld == sum(totalAmount of Funded/Submitted invoices)
 *   I2  no state goes backwards; a closed state (Released/Refunded/Cancelled) never changes
 *   I3  every release pays fee == floor(amount * feeBps / 10000) <= amount * feeBps / 10000,
 *       and seller + feeRecipient receive exactly the escrowed amount
 *   I4  refunds and cancels return the full amount to the buyer, no fee
 */

const RUNS = Number(process.env.FUZZ_RUNS ?? 6);
const STEPS = Number(process.env.FUZZ_STEPS ?? 120);
const SEED = Number(process.env.FUZZ_SEED ?? 0xb011a);

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const S = { Draft: 1, Funded: 2, Submitted: 3, Released: 4, Refunded: 5, Cancelled: 6 };
const CLOSED = new Set([S.Released, S.Refunded, S.Cancelled]);
const rank = (s: number) => (CLOSED.has(s) ? 4 : s);
const CONTAINER = ethers.zeroPadValue("0x00000000000000000000000000000000b0110a00", 32);

describe("BullaEscrow fuzz and invariants", function () {
  this.timeout(600_000);

  it("quoteRelease: fee == floor(amount*bps/1e4), fee <= amount*bps/1e4, fee + net == amount (random amounts, incl. huge)", async () => {
    const [owner, fr] = await ethers.getSigners();
    const T = await ethers.getContractFactory("MockERC20");
    const t = await T.deploy("M", "M", 6);
    const r = rng(SEED);
    const E = await ethers.getContractFactory("BullaEscrow");
    for (const bps of [0, 1, 50, 333, 999, 1000]) {
      const e = await E.deploy(await t.getAddress(), fr.address, bps, owner.address);
      const amounts = [0n, 1n, 199n, 10_000n, 2n ** 255n, ethers.MaxUint256];
      for (let i = 0; i < 40; i++) amounts.push(BigInt(Math.floor(r() * 2 ** 52)) * BigInt(Math.floor(r() * 2 ** 52) + 1));
      for (const a of amounts) {
        const [fee, net] = await e.quoteRelease(a);
        expect(fee).to.equal((a * BigInt(bps)) / 10_000n);
        expect(fee * 10_000n <= a * BigInt(bps)).to.equal(true);
        expect(fee + net).to.equal(a);
      }
    }
  });

  const reached = new Set<number>();
  for (let run = 0; run < RUNS; run++) {
    it(`random walk #${run + 1} (${STEPS} steps): balance == totalHeld == sum(unsettled), no state goes backwards, fee bounded`, async () => {
      const r = rng(SEED + run * 7919);
      const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
      const signers = await ethers.getSigners();
      const [owner, feeRecipient, s1, s2, b1, b2, stranger] = signers;
      const sellers = [s1, s2];
      const buyers = [b1, b2];
      const everyone: HardhatEthersSigner[] = [s1, s2, b1, b2, stranger, owner];
      const feeBps = run === 0 ? 50 : run === 1 ? 1000 : run === 2 ? 0 : Math.floor(r() * 1001);

      const T = await ethers.getContractFactory("MockERC20");
      const token = await T.deploy("Mock USDC", "mUSDC", 6);
      const E = await ethers.getContractFactory("BullaEscrow");
      const escrow = await E.deploy(await token.getAddress(), feeRecipient.address, feeBps, owner.address);
      const ea = await escrow.getAddress();
      for (const b of buyers) {
        await token.mint(b.address, 10n ** 30n);
        await token.connect(b).approve(ea, ethers.MaxUint256);
      }

      const lastState = new Map<bigint, number>();
      const counts: Record<string, number> = { ok: 0, reverted: 0 };

      async function checkInvariants(step: number) {
        const n = await escrow.invoiceCount();
        let sum = 0n;
        for (let id = 1n; id <= n; id++) {
          const inv = await escrow.getInvoice(id);
          const st = Number(inv.state);
          if (st === S.Funded || st === S.Submitted) sum += inv.totalAmount;
          const prev = lastState.get(id);
          if (prev !== undefined) {
            expect(rank(st), `step ${step}: invoice ${id} went backwards ${prev} -> ${st}`).to.be.gte(rank(prev));
            if (CLOSED.has(prev)) expect(st, `step ${step}: closed invoice ${id} changed`).to.equal(prev);
          }
          lastState.set(id, st);
        }
        const held = await escrow.totalHeld();
        const bal = await token.balanceOf(ea);
        expect(held, `step ${step}: totalHeld != sum(unsettled)`).to.equal(sum);
        expect(bal, `step ${step}: balance != totalHeld`).to.equal(held);
      }

      async function attempt(fn: () => Promise<unknown>) {
        try {
          const tx = (await fn()) as { wait: () => Promise<unknown> };
          await tx.wait();
          counts.ok++;
          return true;
        } catch {
          counts.reverted++;
          return false;
        }
      }

      for (let step = 0; step < STEPS; step++) {
        const n = Number(await escrow.invoiceCount());
        const id = BigInt(n === 0 ? 1 : r() < 0.9 ? 1 + Math.floor(r() * n) : n + 1); // 10%: unknown id
        // Bias the caller toward the right party (80%) so the walk reaches deep states; 20% random caller.
        let seller: HardhatEthersSigner | undefined, buyer: HardhatEthersSigner | undefined;
        if (id <= BigInt(n)) {
          const inv = await escrow.getInvoice(id);
          seller = everyone.find((x) => x.address === inv.seller);
          buyer = everyone.find((x) => x.address === inv.buyer);
        }
        const party = (p?: HardhatEthersSigner) => (p && r() < 0.8 ? p : pick(everyone));
        const action = n === 0 ? "create" : pick(["create", "create", "fund", "fund", "submit", "release", "refund", "cancel", "warp"] as const);
        const now = (await ethers.provider.getBlock("latest"))!.timestamp;

        if (action === "create") {
          const cs = pick([...sellers, stranger]);
          const cb = pick([...buyers, cs]); // sometimes invalid (buyer == seller)
          const amount = pick([1n, 150n, 199n, 1_000_000n, BigInt(1 + Math.floor(r() * 1e12))]);
          const due = now + pick([-10, 30, 3600, 86_400, 7 * 86_400, 30 * 86_400]);
          await attempt(() => escrow.connect(cs).createInvoice(cb.address, token.getAddress(), amount, due, ethers.ZeroHash, CONTAINER, "fuzz"));
        } else if (action === "fund") {
          await attempt(() => escrow.connect(party(buyer)).fundInvoice(id));
        } else if (action === "submit") {
          await attempt(() => escrow.connect(party(seller)).submitDelivery(id, ethers.keccak256(ethers.toUtf8Bytes(`d${step}`)), ""));
        } else if (action === "release") {
          let before: { amount: bigint; seller: string; sb: bigint; fb: bigint } | null = null;
          if (id <= BigInt(n)) {
            const inv = await escrow.getInvoice(id);
            before = { amount: inv.totalAmount, seller: inv.seller, sb: await token.balanceOf(inv.seller), fb: await token.balanceOf(feeRecipient.address) };
          }
          const ok = await attempt(() => escrow.connect(party(buyer)).releaseFunds(id));
          if (ok) counts.released = (counts.released ?? 0) + 1;
          if (ok && before) {
            const fee = (await token.balanceOf(feeRecipient.address)) - before.fb;
            const net = (await token.balanceOf(before.seller)) - before.sb;
            expect(fee).to.equal((before.amount * BigInt(feeBps)) / 10_000n);
            expect(fee * 10_000n <= before.amount * BigInt(feeBps)).to.equal(true);
            expect(fee + net).to.equal(before.amount);
          }
        } else if (action === "refund" || action === "cancel") {
          let before: { amount: bigint; buyer: string; bb: bigint; fb: bigint; state: number } | null = null;
          if (id <= BigInt(n)) {
            const inv = await escrow.getInvoice(id);
            before = { amount: inv.totalAmount, buyer: inv.buyer, bb: await token.balanceOf(inv.buyer), fb: await token.balanceOf(feeRecipient.address), state: Number(inv.state) };
          }
          const ok = await attempt(() => (action === "refund" ? escrow.connect(party(buyer)).claimRefund(id) : escrow.connect(party(r() < 0.5 ? seller : buyer)).mutualCancel(id)));
          if (ok && before) {
            const after = await escrow.getInvoice(id);
            if (Number(after.state) === S.Refunded || (Number(after.state) === S.Cancelled && before.state !== S.Draft)) {
              expect((await token.balanceOf(before.buyer)) - before.bb).to.equal(before.amount);
            }
            expect(await token.balanceOf(feeRecipient.address)).to.equal(before.fb);
          }
        } else {
          await network.provider.send("evm_increaseTime", [pick([60, 3600, 86_400, 3 * 86_400])]);
          await network.provider.send("evm_mine", []);
        }
        await checkInvariants(step);
      }
      const finals = [...lastState.values()];
      for (const st of finals) reached.add(st);
      if (process.env.FUZZ_VERBOSE) console.log(`      run ${run + 1}: feeBps=${feeBps} ok=${counts.ok} reverted=${counts.reverted} invoices=${finals.length} states=${JSON.stringify(finals)}`);
      expect(counts.ok, "random walk exercised successful transitions").to.be.greaterThan(STEPS / 8);
      expect(counts.reverted, "random walk exercised rejected calls").to.be.greaterThan(0);
    });
  }

  it("the random walks reached every state (Draft, Funded, Submitted, Released, Refunded, Cancelled)", () => {
    for (const st of Object.values(S)) expect(reached.has(st), `state ${st} never reached; raise FUZZ_STEPS`).to.equal(true);
  });
});
