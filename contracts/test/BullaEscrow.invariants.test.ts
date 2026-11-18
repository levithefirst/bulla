import { expect } from "chai";
import { ethers, network } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Fuzz + invariant tests for BullaEscrow v2 (seeded, reproducible stateful random walk).
 *   FUZZ_RUNS=8 FUZZ_STEPS=150 FUZZ_SEED=42 npx hardhat test test/BullaEscrow.invariants.test.ts
 * Checked after EVERY step:
 *   I1  token.balanceOf(escrow) == totalHeld == sum(unresolved milestone amounts of Funded invoices)
 *   I2  no invoice or milestone state goes backwards; closed states never change
 *   I3  released + refunded <= total; a Completed invoice has released + refunded == total
 *   I5  circuitStats(processor, id) equals the counts and released volume derived from the invoices (funded only)
 * Checked on every successful release:
 *   I4  fee == floor(amount * feeBps / 10000), the payout target receives amount - fee, and the target is
 *       the container (payToContainer and opened) or the live circuit holder
 * Checked on refunds and cancels: the buyer receives exactly the unresolved remainder, no fee.
 */
const RUNS = Number(process.env.FUZZ_RUNS ?? 6);
const STEPS = Number(process.env.FUZZ_STEPS ?? 140);
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

const S = { Draft: 1, Funded: 2, Completed: 3, Refunded: 4, Cancelled: 5 };
const CLOSED = new Set([S.Completed, S.Refunded, S.Cancelled]);
const rank = (s: number) => (CLOSED.has(s) ? 3 : s);
const mrank = (s: number) => (s >= 2 ? 2 : s); // Pending 0, Submitted 1, Released/Refunded 2

describe("BullaEscrow v2 fuzz and invariants", function () {
  this.timeout(900_000);
  const reached = new Set<number>();
  const mReached = new Set<number>();

  it("quoteRelease: fee == floor(amount*bps/1e4) and fee + net == amount (random and extreme amounts)", async () => {
    const [owner, fr] = await ethers.getSigners();
    const t = await (await ethers.getContractFactory("MockERC20")).deploy("M", "M", 6);
    const o = await (await ethers.getContractFactory("MockOpener")).deploy();
    const fa = await (await ethers.getContractFactory("MockTapeOutFactory")).deploy();
    const r = rng(SEED);
    for (const bps of [0, 1, 50, 333, 999, 1000]) {
      const e = await (await ethers.getContractFactory("BullaEscrow")).deploy(await t.getAddress(), await o.getAddress(), await fa.getAddress(), fr.address, bps, owner.address);
      const amounts = [0n, 1n, 199n, 10_000n, 2n ** 255n, ethers.MaxUint256];
      for (let i = 0; i < 40; i++) amounts.push(BigInt(Math.floor(r() * 2 ** 52)) * BigInt(Math.floor(r() * 2 ** 52) + 1));
      for (const a of amounts) {
        const [fee, net] = await e.quoteRelease(a);
        expect(fee).to.equal((a * BigInt(bps)) / 10_000n);
        expect(fee + net).to.equal(a);
      }
    }
  });

  for (let run = 0; run < RUNS; run++) {
    it(`random walk #${run + 1} (${STEPS} steps): balance == totalHeld == unresolved, states only move forward, fees exact`, async () => {
      const r = rng(SEED + run * 7919);
      const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
      const [owner, feeRecipient, s1, s2, b1, b2, arb, stranger] = await ethers.getSigners();
      const everyone: HardhatEthersSigner[] = [s1, s2, b1, b2, arb, stranger, owner];
      const feeBps = run === 0 ? 50 : run === 1 ? 1000 : run === 2 ? 0 : Math.floor(r() * 1001);

      const token = await (await ethers.getContractFactory("MockERC20")).deploy("Mock USDC", "mUSDC", 6);
      const proc = await (await ethers.getContractFactory("MockProcessor")).deploy();
      const opener = await (await ethers.getContractFactory("MockOpener")).deploy();
      const factory = await (await ethers.getContractFactory("MockTapeOutFactory")).deploy();
      await factory.addCpu(await proc.getAddress());
      const escrow = await (await ethers.getContractFactory("BullaEscrow")).deploy(await token.getAddress(), await opener.getAddress(), await factory.getAddress(), feeRecipient.address, feeBps, owner.address);
      const ea = await escrow.getAddress();
      for (const s of [s1, s2]) await proc.connect(s).mint(); // circuits #1 (s1), #2 (s2)
      for (const b of [b1, b2]) {
        await token.mint(b.address, 10n ** 30n);
        await token.connect(b).approve(ea, ethers.MaxUint256);
      }

      const lastInv = new Map<bigint, number>();
      const lastMs = new Map<string, number>();
      let ok = 0;
      let reverted = 0;

      async function check(step: number) {
        const n = await escrow.invoiceCount();
        let sum = 0n;
        for (let id = 1n; id <= n; id++) {
          const inv = await escrow.getInvoice(id);
          const ms = await escrow.getMilestones(id);
          const st = Number(inv.state);
          reached.add(st);
          if (st === S.Funded) for (const m of ms) if (Number(m.state) < 2) sum += m.amount;
          const prev = lastInv.get(id);
          if (prev !== undefined) {
            expect(rank(st), `step ${step}: invoice ${id} went backwards ${prev} -> ${st}`).to.be.gte(rank(prev));
            if (CLOSED.has(prev)) expect(st, `step ${step}: closed invoice ${id} changed`).to.equal(prev);
          }
          lastInv.set(id, st);
          expect(inv.releasedAmount + inv.refundedAmount <= inv.totalAmount).to.equal(true);
          if (st === S.Completed) expect(inv.releasedAmount + inv.refundedAmount).to.equal(inv.totalAmount);
          ms.forEach((m, i) => {
            const k = `${id}:${i}`;
            const ms2 = Number(m.state);
            mReached.add(ms2);
            const p = lastMs.get(k);
            if (p !== undefined) {
              expect(mrank(ms2), `step ${step}: milestone ${k} went backwards`).to.be.gte(mrank(p));
              if (p >= 2) expect(ms2, `step ${step}: closed milestone ${k} changed`).to.equal(p);
            }
            lastMs.set(k, ms2);
          });
        }
        // I5 on-chain circuit stats match the invoices: released amount and counts per circuit.
        const agg = new Map<string, { inv: bigint; rel: bigint; relAmt: bigint; ref: bigint }>();
        for (let id = 1n; id <= n; id++) {
          const inv = await escrow.getInvoice(id);
          const k = `${inv.processor}:${inv.circuitId}`;
          const a = agg.get(k) ?? { inv: 0n, rel: 0n, relAmt: 0n, ref: 0n };
          if (inv.fundedAt > 0n) a.inv += 1n; // only funded invoices count; unfunded drafts are excluded
          for (const m of await escrow.getMilestones(id)) {
            if (Number(m.state) === 2) (a.rel += 1n), (a.relAmt += m.amount);
            if (Number(m.state) === 3) a.ref += 1n;
          }
          agg.set(k, a);
        }
        for (const [k, a] of agg) {
          const [pr, cid] = k.split(":");
          const st = await escrow.circuitStats(pr, BigInt(cid));
          expect([st.fundedInvoices, st.releasedMilestones, st.releasedAmount, st.refundedMilestones], `step ${step}: circuit stats for ${k}`).to.deep.equal([a.inv, a.rel, a.relAmt, a.ref]);
        }
        const held = await escrow.totalHeld();
        expect(held, `step ${step}: totalHeld != unresolved`).to.equal(sum);
        expect(await token.balanceOf(ea), `step ${step}: balance != totalHeld`).to.equal(held);
      }

      async function attempt(fn: () => Promise<{ wait: () => Promise<unknown> }>) {
        try {
          await (await fn()).wait();
          ok++;
          return true;
        } catch {
          reverted++;
          return false;
        }
      }

      for (let step = 0; step < STEPS; step++) {
        const n = Number(await escrow.invoiceCount());
        const id = BigInt(n === 0 ? 1 : r() < 0.9 ? 1 + Math.floor(r() * n) : n + 1);
        const known = id <= BigInt(n);
        const inv = known ? await escrow.getInvoice(id) : null;
        const ms = known ? await escrow.getMilestones(id) : [];
        const find = (a?: string) => everyone.find((x) => x.address === a);
        const party = (p?: HardhatEthersSigner) => (p && r() < 0.8 ? p : pick(everyone));
        const mi = ms.length ? Math.floor(r() * (ms.length + (r() < 0.1 ? 1 : 0))) : 0;
        const action = n === 0 ? "create" : pick(["create", "create", "fund", "fund", "submit", "submit", "release", "release", "arbRelease", "arbRefund", "refund", "cancel", "cancel", "revoke", "warp", "transfer", "open"] as const);
        const now = (await ethers.provider.getBlock("latest"))!.timestamp;

        if (action === "create") {
          const cid = pick([1, 2, 1, 2, 3]); // #3 does not exist
          const holder = cid <= 2 ? find(await proc.ownerOf(cid)) : undefined;
          const seller = holder && r() < 0.85 ? holder : pick([s1, s2, stranger]);
          const k = 1 + Math.floor(r() * 4);
          const amounts = Array.from({ length: k }, () => pick([1n, 150n, 1_000_000n, BigInt(1 + Math.floor(r() * 1e12))]));
          await attempt(() =>
            escrow.connect(seller).createInvoice({
              buyer: (r() < 0.9 ? pick([b1, b2]) : seller).address,
              token: token.getAddress(),
              amounts,
              labels: amounts.map((_, i) => `m${i}`),
              dueTimestamp: now + pick([-10, 3600, 86_400, 7 * 86_400, 30 * 86_400, 30 * 86_400]),
              processor: proc.getAddress(),
              circuitId: cid,
              payToContainer: r() < 0.5,
              arbiter: pick([ethers.ZeroAddress, ethers.ZeroAddress, arb.address]),
              termsHash: ethers.ZeroHash,
              memo: "fuzz",
            }),
          );
        } else if (action === "fund") {
          await attempt(() => escrow.connect(party(find(inv?.buyer))).fundInvoice(id, r() < 0.9 ? inv?.arbiter ?? ethers.ZeroAddress : stranger.address));
        } else if (action === "submit") {
          await attempt(() => escrow.connect(party(find(inv?.seller))).submitMilestone(id, mi, ethers.keccak256(ethers.toUtf8Bytes(`d${step}`)), ""));
        } else if (action === "release" || action === "arbRelease") {
          const caller = action === "release" ? party(find(inv?.buyer)) : party(find(inv?.arbiter));
          let expected: { target: string; amount: bigint; tb: bigint; fb: bigint } | null = null;
          if (known && mi < ms.length) {
            const opened = await opener.isOpened(await proc.getAddress(), inv!.circuitId);
            const target = inv!.payToContainer && opened ? inv!.container : await proc.ownerOf(inv!.circuitId);
            expected = { target, amount: ms[mi].amount, tb: await token.balanceOf(target), fb: await token.balanceOf(feeRecipient.address) };
          }
          const done = await attempt(() => (action === "release" ? escrow.connect(caller).releaseMilestone(id, mi) : escrow.connect(caller).arbiterRelease(id, mi)));
          if (done && expected) {
            const fee = (await token.balanceOf(feeRecipient.address)) - expected.fb;
            const got = (await token.balanceOf(expected.target)) - expected.tb;
            expect(fee).to.equal((expected.amount * BigInt(feeBps)) / 10_000n);
            expect(got + (expected.target === feeRecipient.address ? 0n : fee)).to.equal(expected.amount);
            expect((await escrow.getMilestones(id))[mi].paidTo).to.equal(expected.target);
          }
        } else if (action === "arbRefund" || action === "refund" || action === "cancel") {
          let before: { bb: bigint; fb: bigint; unresolved: bigint; amount: bigint; buyer: string } | null = null;
          if (known) {
            const unresolved = ms.filter((m) => Number(m.state) < 2).reduce((a, m) => a + m.amount, 0n);
            before = { bb: await token.balanceOf(inv!.buyer), fb: await token.balanceOf(feeRecipient.address), unresolved, amount: mi < ms.length ? ms[mi].amount : 0n, buyer: inv!.buyer };
          }
          const callFn =
            action === "arbRefund"
              ? () => escrow.connect(party(find(inv?.arbiter))).arbiterRefund(id, mi)
              : action === "refund"
                ? () => escrow.connect(party(find(inv?.buyer))).claimRefund(id)
                : () => escrow.connect(party(r() < 0.5 ? find(inv?.seller) : find(inv?.buyer))).mutualCancel(id);
          const done = await attempt(callFn);
          if (done && before) {
            const st = Number((await escrow.getInvoice(id)).state);
            const delta = (await token.balanceOf(before.buyer)) - before.bb;
            if (action === "arbRefund") expect(delta).to.equal(before.amount);
            else if (action === "refund" || (action === "cancel" && st === S.Cancelled && Number(inv!.state) === S.Funded)) expect(delta).to.equal(before.unresolved);
            expect(await token.balanceOf(feeRecipient.address)).to.equal(before.fb);
          }
        } else if (action === "revoke") {
          const ok = await attempt(() => escrow.connect(party(r() < 0.5 ? find(inv?.seller) : find(inv?.buyer))).revokeCancelConsent(id));
          if (ok) expect(Number((await escrow.getInvoice(id)).state)).to.be.oneOf([S.Draft, S.Funded]);
        } else if (action === "open") {
          await attempt(() => opener.open(proc.getAddress(), pick([1, 2])));
        } else if (action === "transfer") {
          const holderId = pick([1, 2]);
          const holder = find(await proc.ownerOf(holderId));
          if (holder) await attempt(() => proc.connect(holder).transferFrom(holder.address, pick([s1, s2, stranger]).address, holderId));
        } else {
          await network.provider.send("evm_increaseTime", [pick([60, 3600, 86_400, 3 * 86_400])]);
          await network.provider.send("evm_mine", []);
        }
        await check(step);
      }
      if (process.env.FUZZ_VERBOSE) console.log(`      run ${run + 1}: feeBps=${feeBps} ok=${ok} reverted=${reverted}`);
      expect(ok, "the walk exercised successful transitions").to.be.greaterThan(STEPS / 8);
      expect(reverted, "the walk exercised rejected calls").to.be.greaterThan(0);
    });
  }

  it("the random walks reached every invoice state and every milestone state", () => {
    for (const st of Object.values(S)) expect(reached.has(st), `invoice state ${st} never reached; raise FUZZ_STEPS`).to.equal(true);
    for (const st of [0, 1, 2, 3]) expect(mReached.has(st), `milestone state ${st} never reached`).to.equal(true);
  });
});
