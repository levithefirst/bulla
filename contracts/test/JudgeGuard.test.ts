import { expect } from "chai";
import type { Hex } from "viem";
import {
  heartbeatTabLock,
  isNonceError,
  NonceBook,
  releaseTabLock,
  sendRecovering,
  SingleFlight,
  tryAcquireTabLock,
  type KV,
} from "../../shared/judgeGuard";

const memKv = (): KV & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};
const tick = () => new Promise((r) => setTimeout(r, 5));
const H = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as Hex;

describe("judge-mode guards (single-flight, nonces, tab lock, send recovery)", () => {
  describe("SingleFlight", () => {
    it("starts one job for concurrent calls and hands the later caller the active run", async () => {
      const sf = new SingleFlight();
      let started = 0;
      let release!: (v: number) => void;
      const gate = new Promise<number>((r) => (release = r));
      const job = async () => (started++, gate);
      const a = sf.run(job);
      const b = sf.run(job);
      expect(sf.busy).to.equal(true);
      expect(b).to.equal(a);
      release(7);
      expect(await a).to.equal(7);
      expect(await b).to.equal(7);
      expect(started).to.equal(1);
    });

    it("is busy synchronously, before the job's first await", () => {
      const sf = new SingleFlight();
      const p = sf.run(async () => 1);
      expect(sf.busy).to.equal(true);
      return p;
    });

    it("allows a new run once the previous one settled, including after a failure", async () => {
      const sf = new SingleFlight();
      await sf.run(async () => 1);
      expect(sf.busy).to.equal(false);
      await sf.run(async () => Promise.reject(new Error("boom"))).catch(() => undefined);
      await tick();
      expect(sf.busy).to.equal(false);
      expect(await sf.run(async () => 3)).to.equal(3);
    });
  });

  describe("NonceBook / NonceCounter", () => {
    it("starts at the pending nonce and counts up, recording the last nonce used", () => {
      const book = new NonceBook();
      const c = book.counter("0xAbC", 5);
      expect([c.next(), c.next(), c.next()]).to.deep.equal([5, 6, 7]);
      expect(book.lastUsed("0xabc")).to.equal(7);
    });

    it("takes the max of the RPC pending nonce and last used + 1 (a lagging RPC cannot reuse a nonce)", () => {
      const book = new NonceBook();
      const first = book.counter("0xabc", 10);
      first.next();
      first.next(); // used 10, 11
      const second = book.counter("0xABC", 10); // RPC still says 10
      expect(second.peek()).to.equal(12);
      expect(second.next()).to.equal(12);
      expect(book.counter("0xabc", 40).peek()).to.equal(40); // RPC ahead of us wins
    });

    it("keeps senders separate and never moves the last-used nonce backwards", () => {
      const book = new NonceBook();
      book.counter("0x1", 3).next();
      expect(book.counter("0x2", 0).peek()).to.equal(0);
      book.mark("0x1", 1);
      expect(book.lastUsed("0x1")).to.equal(3);
    });

    it("recover jumps to the fresh pending count when it is ahead, else takes the next free nonce", () => {
      const book = new NonceBook();
      const c = book.counter("0xabc", 0);
      c.next();
      c.next(); // 0, 1; next is 2
      expect(c.recover(9)).to.equal(9);
      expect(c.next()).to.equal(10);
      expect(c.recover(3)).to.equal(11);
    });
  });

  describe("tab lock", () => {
    it("denies a second owner while the lease is fresh and grants it after the ttl", () => {
      const kv = memKv();
      expect(tryAcquireTabLock(kv, "k", "tabA", 1_000, 15_000)).to.equal(true);
      expect(tryAcquireTabLock(kv, "k", "tabB", 5_000, 15_000)).to.equal(false);
      expect(tryAcquireTabLock(kv, "k", "tabB", 16_001, 15_000)).to.equal(true);
    });

    it("lets the same owner re-acquire, and the heartbeat keeps the lease alive", () => {
      const kv = memKv();
      tryAcquireTabLock(kv, "k", "tabA", 0, 15_000);
      expect(tryAcquireTabLock(kv, "k", "tabA", 1_000, 15_000)).to.equal(true);
      expect(heartbeatTabLock(kv, "k", "tabA", 14_000)).to.equal(true);
      expect(tryAcquireTabLock(kv, "k", "tabB", 20_000, 15_000)).to.equal(false); // refreshed at 14 000
    });

    it("heartbeat reports a takeover; release frees only the owner's own lease", () => {
      const kv = memKv();
      tryAcquireTabLock(kv, "k", "tabA", 0, 15_000);
      releaseTabLock(kv, "k", "tabB");
      expect(kv.getItem("k")).to.not.equal(null);
      tryAcquireTabLock(kv, "k", "tabB", 20_000, 15_000); // tabA's lease expired
      expect(heartbeatTabLock(kv, "k", "tabA", 21_000)).to.equal(false);
      releaseTabLock(kv, "k", "tabB");
      expect(kv.getItem("k")).to.equal(null);
      expect(tryAcquireTabLock(kv, "k", "tabA", 22_000, 15_000)).to.equal(true);
    });

    it("ignores a corrupt lease and grants the lock when storage throws", () => {
      const kv = memKv();
      kv.setItem("k", "not json");
      expect(tryAcquireTabLock(kv, "k", "tabA", 0, 15_000)).to.equal(true);
      const broken: KV = {
        getItem: () => {
          throw new Error("denied");
        },
        setItem: () => {
          throw new Error("denied");
        },
        removeItem: () => {
          throw new Error("denied");
        },
      };
      expect(tryAcquireTabLock(broken, "k", "tabA")).to.equal(true);
      expect(heartbeatTabLock(broken, "k", "tabA")).to.equal(true);
      releaseTabLock(broken, "k", "tabA");
    });
  });

  describe("sendRecovering", () => {
    const setup = (broadcast: (raw: Hex) => Promise<unknown>, known: (h: Hex) => Promise<boolean>, pending = 20) => {
      const book = new NonceBook();
      const counter = book.counter("0xabc", 4);
      const signed: number[] = [];
      let reads = 0;
      const deps = {
        counter,
        readPending: async () => (reads++, pending),
        sign: async (n: number) => (signed.push(n), { raw: H(n), hash: H(1000 + n) }),
        broadcast,
        known,
      };
      return { deps, signed, reads: () => reads, book };
    };

    it("sends once with the next nonce on success", async () => {
      const t = setup(async () => "ok", async () => false);
      expect(await sendRecovering(t.deps)).to.equal(H(1004));
      expect(t.signed).to.deep.equal([4]);
      expect(t.reads()).to.equal(0);
    });

    it("does not double-send when 'already known' and the tx exists: returns the existing hash", async () => {
      let sends = 0;
      const t = setup(
        async () => (sends++, Promise.reject(new Error("already known"))),
        async (h) => h === H(1004),
      );
      expect(await sendRecovering(t.deps)).to.equal(H(1004));
      expect(sends).to.equal(1);
      expect(t.signed).to.deep.equal([4]);
    });

    it("on 'nonce too low' with no such tx, re-reads the pending nonce once and retries that step with a fresh nonce", async () => {
      let sends = 0;
      const t = setup(
        async () => {
          if (sends++ === 0) throw Object.assign(new Error("boom"), { shortMessage: "Nonce provided for the transaction is lower than the current nonce" });
          return "ok";
        },
        async () => false,
      );
      expect(await sendRecovering(t.deps)).to.equal(H(1020));
      expect(t.signed).to.deep.equal([4, 20]);
      expect(t.reads()).to.equal(1);
      expect(t.book.lastUsed("0xabc")).to.equal(20);
    });

    it("retries only once: a second nonce collision is thrown", async () => {
      const t = setup(async () => Promise.reject(new Error("replacement transaction underpriced")), async () => false);
      let err: unknown;
      await sendRecovering(t.deps).catch((e) => (err = e));
      expect((err as Error).message).to.match(/underpriced/);
      expect(t.signed).to.have.length(2);
      expect(t.reads()).to.equal(1);
    });

    it("throws other errors immediately without re-reading or retrying", async () => {
      const t = setup(async () => Promise.reject(new Error("insufficient funds")), async () => false);
      let err: unknown;
      await sendRecovering(t.deps).catch((e) => (err = e));
      expect((err as Error).message).to.match(/insufficient funds/);
      expect(t.signed).to.have.length(1);
      expect(t.reads()).to.equal(0);
    });

    it("classifies nonce errors from the node and viem", () => {
      for (const m of ["nonce too low", "Nonce too low. Expected nonce to be 5 but got 4", "already known", "known transaction: abc", "replacement transaction underpriced", "replacement underpriced"]) {
        expect(isNonceError(new Error(m)), m).to.equal(true);
      }
      expect(isNonceError({ shortMessage: "Nonce provided for the transaction is lower than the current nonce of the account", message: "x" })).to.equal(true);
      expect(isNonceError(new Error("execution reverted"))).to.equal(false);
    });
  });
});
