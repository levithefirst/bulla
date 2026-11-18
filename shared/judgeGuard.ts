/**
 * Judge-mode run guards, kept free of browser and chain dependencies so they can be unit tested:
 *  - SingleFlight: at most one run per tab, whatever React state says.
 *  - NonceBook / NonceCounter: local nonce bookkeeping that never goes backwards within a tab.
 *  - Tab lock: a localStorage lease so two tabs with the same demo wallets do not run at once.
 *  - sendRecovering: send one transaction, and on a nonce collision check whether it already exists before retrying once.
 */
import type { Hex } from "viem";

/** Runs one async job at a time. A call made while a job is active gets that job's promise and does not start another. */
export class SingleFlight {
  private active: Promise<unknown> | null = null;

  get busy(): boolean {
    return this.active !== null;
  }

  run<T>(job: () => Promise<T>): Promise<T> {
    if (this.active) return this.active as Promise<T>;
    const p: Promise<T> = Promise.resolve()
      .then(job)
      .finally(() => {
        if (this.active === p) this.active = null;
      });
    this.active = p;
    return p;
  }
}

const key = (a: string) => a.toLowerCase();

/** Remembers the last nonce this tab used per address, so a lagging RPC cannot hand out a nonce twice. */
export class NonceBook {
  private last = new Map<string, number>();

  lastUsed(addr: string): number | undefined {
    return this.last.get(key(addr));
  }

  /** First nonce to use: the larger of the RPC's pending count and (last nonce this tab used) + 1. */
  start(addr: string, pending: number): number {
    const l = this.last.get(key(addr));
    return l === undefined ? pending : Math.max(pending, l + 1);
  }

  mark(addr: string, nonce: number): void {
    const l = this.last.get(key(addr));
    if (l === undefined || nonce > l) this.last.set(key(addr), nonce);
  }

  counter(addr: string, pending: number): NonceCounter {
    return new NonceCounter(this, addr, this.start(addr, pending));
  }
}

/** Hands out consecutive nonces for one sender and records each one in the book. */
export class NonceCounter {
  constructor(
    private book: NonceBook,
    readonly addr: string,
    private nextNonce: number,
  ) {}

  peek(): number {
    return this.nextNonce;
  }

  next(): number {
    const n = this.nextNonce++;
    this.book.mark(this.addr, n);
    return n;
  }

  /** After a nonce collision: never go below the freshly read pending count, then take the next free nonce. */
  recover(pending: number): number {
    if (pending > this.nextNonce) this.nextNonce = pending;
    return this.next();
  }
}

const NONCE_ERROR = /nonce too low|lower than the current nonce|nonce has already been used|already known|known transaction|replacement transaction underpriced|replacement underpriced/i;

export function isNonceError(e: unknown): boolean {
  const x = e as { shortMessage?: string; message?: string; details?: string } | null;
  return NONCE_ERROR.test(`${x?.shortMessage ?? ""} ${x?.message ?? ""} ${x?.details ?? ""}` || String(e));
}

export type SendDeps = {
  counter: NonceCounter;
  readPending: () => Promise<number>;
  sign: (nonce: number) => Promise<{ raw: Hex; hash: Hex }>;
  broadcast: (raw: Hex) => Promise<unknown>;
  /** True if a transaction with this hash is already known to the node (mined or pending). */
  known: (hash: Hex) => Promise<boolean>;
};

/**
 * Send one transaction with the next local nonce. On "nonce too low", "already known" or "replacement underpriced":
 * if this exact transaction (same hash) already exists it is NOT sent again; otherwise the pending nonce is re-read once
 * and the single step is retried with a fresh nonce. Any other error, or a second collision, is thrown.
 */
export async function sendRecovering(d: SendDeps): Promise<Hex> {
  let nonce = d.counter.next();
  let retried = false;
  for (;;) {
    const { raw, hash } = await d.sign(nonce);
    try {
      await d.broadcast(raw);
      return hash;
    } catch (e) {
      if (!isNonceError(e)) throw e;
      if (await d.known(hash)) return hash;
      if (retried) throw e;
      retried = true;
      nonce = d.counter.recover(await d.readPending());
    }
  }
}

// ---- Cross-tab lease (localStorage) ----

export type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };
/** A lease older than this is treated as abandoned (a closed or crashed tab). The running tab refreshes it well within this. */
export const TAB_LOCK_TTL_MS = 15_000;
export const TAB_LOCK_BEAT_MS = 4_000;

type Lease = { owner: string; ts: number };
const readLease = (kv: KV, k: string): Lease | null => {
  try {
    const raw = kv.getItem(k);
    if (!raw) return null;
    const j = JSON.parse(raw) as Lease;
    return typeof j?.owner === "string" && typeof j?.ts === "number" ? j : null;
  } catch {
    return null;
  }
};

/** Take the lease unless a different owner holds a fresh one. Storage that throws (private mode) cannot coordinate, so it grants the lease. */
export function tryAcquireTabLock(kv: KV, lockKey: string, owner: string, now = Date.now(), ttlMs = TAB_LOCK_TTL_MS): boolean {
  try {
    const cur = readLease(kv, lockKey);
    if (cur && cur.owner !== owner && now - cur.ts < ttlMs) return false;
    kv.setItem(lockKey, JSON.stringify({ owner, ts: now } satisfies Lease));
    return readLease(kv, lockKey)?.owner === owner; // last writer wins; the loser sees another owner here
  } catch {
    return true;
  }
}

/** Refresh the lease while running. Returns false if another tab took it over. */
export function heartbeatTabLock(kv: KV, lockKey: string, owner: string, now = Date.now()): boolean {
  try {
    const cur = readLease(kv, lockKey);
    if (cur && cur.owner !== owner) return false;
    kv.setItem(lockKey, JSON.stringify({ owner, ts: now } satisfies Lease));
    return true;
  } catch {
    return true;
  }
}

export function releaseTabLock(kv: KV, lockKey: string, owner: string): void {
  try {
    if (readLease(kv, lockKey)?.owner === owner) kv.removeItem(lockKey);
  } catch {
    /* nothing to release */
  }
}
