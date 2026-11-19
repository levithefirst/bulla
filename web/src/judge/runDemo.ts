/**
 * One-tap judge-mode milestone escrow on X Layer TESTNET (1952), or the local CI node (31337).
 * Every step is a real transaction signed by an in-browser burner key:
 *   gas tank -> burners (testnet OKB), Freelancer mints a stand-in TapeOut circuit and opens its container, Client mints DemoUSD
 *   and approves, Freelancer creates a 2-milestone invoice paid into the circuit's container, Client funds,
 *   Freelancer submits both milestones, Client releases both: the DemoUSD lands in the container.
 * TapeOut has no testnet deployment, so the circuit, opener and factory are labelled stand-ins.
 * Each sender's transactions are submitted in nonce order; receipts are awaited in parallel.
 */
import { createClient, decodeEventLog, http, encodeFunctionData, erc20Abi, keccak256, maxUint256, parseUnits, toBytes, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bullaEscrowAbi } from "../abi/bullaEscrow";
import { mockProcessorAbi } from "../abi/mockProcessor";
import { config } from "../config";
import { client } from "../lib/client";
import { ethCall, waitForReceipt } from "../../../shared/rpc";
import { heartbeatTabLock, NonceBook, releaseTabLock, sendRecovering, SingleFlight, TAB_LOCK_BEAT_MS, tryAcquireTabLock, type KV, type NonceCounter } from "../../../shared/judgeGuard";
import type { Burners, Role } from "./burners";

export const DEMO_MILESTONES = [
  { label: "Logo concepts", amount: parseUnits("100", 6) },
  { label: "Final logo files", amount: parseUnits("150", 6) },
] as const;
export const DEMO_AMOUNT = DEMO_MILESTONES.reduce((a, m) => a + m.amount, 0n);
/** Gas budget per burner for one run (both milestones), used for the top-up and the per-run cap. */
export const GAS_UNITS_PER_ROLE = 1_200_000n;
/** Default per-run cap on what the tank may send, in gas units at the current price (override in wei with VITE_DEMO_RUN_CAP_WEI). */
const RUN_CAP_GAS_UNITS = 3_000_000n;

const openerAbi = [
  {
    type: "function",
    name: "open",
    stateMutability: "nonpayable",
    inputs: [
      { name: "circuits", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
] as const;
const demoUsdAbi = [{ type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] }] as const;

export type StepKey = "gasFreelancer" | "gasClient" | "circuit" | "open" | "mint" | "approve" | "create" | "fund" | "submit0" | "submit1" | "release0" | "release1";
export type StepStatus = "idle" | "running" | "done" | "skipped" | "error";
export type Step = { key: StepKey; label: string; role: Role | "tank"; status: StepStatus; hash?: Hex; note?: string };

export const STEPS: Omit<Step, "status">[] = [
  { key: "gasFreelancer", label: "Gas tank sends testnet OKB to the Freelancer", role: "tank" },
  { key: "gasClient", label: "Gas tank sends testnet OKB to the Client", role: "tank" },
  { key: "circuit", label: "Freelancer mints a circuit (testnet stand-in for TapeOut)", role: "freelancer" },
  { key: "open", label: "Freelancer opens the circuit's container (stand-in; on mainnet open() costs 0.08 OKB)", role: "freelancer" },
  { key: "mint", label: "Client mints 250 DemoUSD", role: "client" },
  { key: "approve", label: "Client approves the escrow to pull DemoUSD", role: "client" },
  { key: "create", label: "Freelancer bills 2 milestones with that circuit (ownerOf checked on chain)", role: "freelancer" },
  { key: "fund", label: "Client funds it: 250 DemoUSD locked in escrow", role: "client" },
  { key: "submit0", label: "Freelancer submits milestone 1: logo concepts", role: "freelancer" },
  { key: "submit1", label: "Freelancer submits milestone 2: final logo files", role: "freelancer" },
  { key: "release0", label: "Client releases milestone 1 into the Freelancer's container", role: "client" },
  { key: "release1", label: "Client releases milestone 2 into the Freelancer's container", role: "client" },
];

export class JudgeError extends Error {
  constructor(
    public code: "chain" | "notDeployed" | "tankMissing" | "tankEmpty" | "cap" | "busy" | "tx",
    message: string,
  ) {
    super(message);
  }
}

export type Hooks = {
  step(key: StepKey, patch: Partial<Step>): void;
  state(invoiceId: bigint, state: number, milestoneStates: number[]): void;
  active(role: Role | "tank"): void;
  container(address: Address, circuitId: bigint): void;
};

const allowedChain = () => config.chain.id === 1952 || (config.chain.id === 31337 && config.networkKey === "localhost");

export function tankKey(): Hex | null {
  const k = import.meta.env.VITE_DEMO_GAS_TANK_KEY;
  return k && /^0x[0-9a-fA-F]{64}$/.test(k) ? (k as Hex) : null;
}

export function tankAddress(): Address | null {
  const k = tankKey();
  return k ? privateKeyToAccount(k).address : null;
}

const balance = async (a: Address) => BigInt((await client.request({ method: "eth_getBalance", params: [a, "latest"] })) as Hex);
/**
 * The public X Layer testnet RPC is load-balanced: a read right after a confirmed receipt can land on a node
 * one block behind and revert (e.g. InvoiceNotFound). Retry reads briefly instead of failing the demo.
 */
async function settled<T>(fn: () => Promise<T>, tries = 15, waitMs = 200): Promise<T> {
  for (let n = 1; ; n++) {
    try {
      return await fn();
    } catch (e) {
      if (n >= tries) throw e;
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}
/** Receipt poll interval. X Layer has ~1 s blocks, so a short poll keeps the wait close to the block time. */
const RECEIPT_POLL_MS = 200;
/** Gas price sent with every judge transaction: the node's price plus 20%, so a price tick does not strand a pipelined tx. */
const bumped = (gp: bigint) => (gp * 12n) / 10n;
/** Explicit gas limits (ceilings, not spend): skipping eth_estimateGas saves a round trip per transaction. */
const GAS = { circuit: 150_000n, open: 200_000n, create: 700_000n, mint: 150_000n, approve: 100_000n, fund: 300_000n, submit: 250_000n, release: 350_000n } as const;
const nonceOf = async (a: Address) => Number(BigInt((await client.request({ method: "eth_getTransactionCount", params: [a, "pending"] })) as Hex));
const gasPriceNow = async () => BigInt((await client.request({ method: "eth_gasPrice" })) as Hex);

/** Per-run cap on tank spend, in wei. */
export function runCapWei(gasPrice: bigint): bigint {
  const env = import.meta.env.VITE_DEMO_RUN_CAP_WEI;
  return env && /^\d+$/.test(env) ? BigInt(env) : gasPrice * RUN_CAP_GAS_UNITS;
}

/** Tank balance and an honest estimate of full runs left (fresh burners each time). */
export async function tankStatus(): Promise<{ address: Address; balance: bigint; perRun: bigint; runsLeft: number } | null> {
  const a = tankAddress();
  if (!a) return null;
  const [b, gp] = await Promise.all([balance(a), gasPriceNow()]);
  const perRun = bumped(gp) * GAS_UNITS_PER_ROLE * 2n + bumped(gp) * 21_000n * 2n;
  return { address: a, balance: b, perRun, runsLeft: perRun > 0n ? Number(b / perRun) : 0 };
}

async function runDemoInner(burners: Burners, hooks: Hooks): Promise<{ invoiceId: bigint; ms: number; container: Address; containerReceived: bigint }> {
  const t0 = performance.now();
  // 1. Guards: testnet (or local CI) only, contracts present, tank configured, funded and under the per-run cap.
  if (!allowedChain()) throw new JudgeError("chain", `Judge mode runs only on X Layer testnet (chain 1952). This build targets ${config.chain.name} (${config.chain.id}).`);
  const rpcChain = Number(BigInt((await client.request({ method: "eth_chainId" })) as Hex));
  if (rpcChain !== config.chain.id) throw new JudgeError("chain", `The RPC reports chain ${rpcChain}, expected ${config.chain.id}. Refusing to run.`);
  const j = config.judge;
  if (!j || !j.tapeout?.processor) throw new JudgeError("notDeployed", "The judge-mode escrow and TapeOut stand-ins are not deployed on this network yet.");
  const processor = j.tapeout.processor;
  const tk = tankKey();
  if (!tk) throw new JudgeError("tankMissing", "This build has no demo gas tank configured.");

  const chain = config.chain;
  const tankA = privateKeyToAccount(tk);
  const fwA = privateKeyToAccount(burners.freelancer.privateKey);
  const cwA = privateKeyToAccount(burners.client.privateKey);

  const gasPrice = bumped(await gasPriceNow());
  const need = gasPrice * GAS_UNITS_PER_ROLE;
  const [fb, cb, tb, tn, fn0, cn0] = await Promise.all([
    balance(burners.freelancer.address),
    balance(burners.client.address),
    balance(tankA.address),
    nonceOf(tankA.address),
    nonceOf(burners.freelancer.address),
    nonceOf(burners.client.address),
  ]);
  const topUps = [fb < need ? need - fb : 0n, cb < need ? need - cb : 0n];
  const spend = topUps[0] + topUps[1] + gasPrice * 21_000n * 2n;
  const cap = runCapWei(gasPrice);
  if (topUps[0] + topUps[1] > cap) {
    throw new JudgeError("cap", `This run would need ${fmtOkb(topUps[0] + topUps[1])} testnet OKB from the demo tank, above the per-run cap of ${fmtOkb(cap)}. Nothing was sent. Gas may be unusually expensive; try again later.`);
  }
  if ((topUps[0] || topUps[1]) && tb < spend) {
    throw new JudgeError("tankEmpty", `Demo gas tank empty: it holds ${fmtOkb(tb)} testnet OKB and this run needs ${fmtOkb(spend)}. Nothing was sent. Try again later, or use your own wallet.`);
  }

  // Fresh nonces for this run: the RPC's pending count, but never below (last nonce this tab used) + 1, because the
  // load-balanced testnet RPC can lag. Every send takes the next counter value and records it in the tab's nonce book.
  const tankN = nonceBook.counter(tankA.address, tn);
  const fN = nonceBook.counter(burners.freelancer.address, fn0);
  const cN = nonceBook.counter(burners.client.address, cn0);
  // Broadcasts go through their own unbatched transport: the shared read client batches calls, and a node can reject a batch
  // that carries several raw transactions (seen as intermittent "Missing or invalid parameters").
  const sendClient = createClient({ chain, transport: http(config.rpcUrl, { timeout: 20_000 }) });
  type Tx = { to: Address; data?: Hex; value?: bigint; gas: bigint };
  // Per-sender lane: broadcasts leave in the order they were requested, so nonce n always reaches the node before n + 1
  // (nodes with automine, like the local Hardhat node, can stall a transaction that arrives ahead of its predecessor).
  const lanes = new Map<string, Promise<unknown>>();
  const send = (acct: typeof tankA, counter: NonceCounter, t: Tx): Promise<Hex> => {
    const prev = lanes.get(acct.address) ?? Promise.resolve();
    const job = prev.catch(() => undefined).then(() => sendOne(acct, counter, t));
    lanes.set(acct.address, job);
    return job;
  };
  const sendOne = (acct: typeof tankA, counter: NonceCounter, t: Tx) =>
    sendRecovering({
      counter,
      readPending: () => nonceOf(acct.address),
      sign: async (nonce) => {
        const raw = await acct.signTransaction({ type: "legacy", chainId: chain.id, to: t.to, data: t.data, value: t.value, gas: t.gas, gasPrice, nonce });
        return { raw, hash: keccak256(raw) };
      },
      broadcast: (raw) => sendClient.request({ method: "eth_sendRawTransaction", params: [raw] }),
      known: async (h) =>
        (await client.request({ method: "eth_getTransactionReceipt", params: [h] })) != null || (await client.request({ method: "eth_getTransactionByHash", params: [h] })) != null,
    });

  const label = (key: StepKey) => STEPS.find((s) => s.key === key)!.label;
  const submit = async (key: StepKey, role: Role | "tank", fn: () => Promise<Hex>) => {
    hooks.active(role);
    hooks.step(key, { status: "running" });
    try {
      const hash = await fn();
      hooks.step(key, { hash });
      return { key, hash };
    } catch (e) {
      hooks.step(key, { status: "error", note: shortErr(e) });
      throw new JudgeError("tx", `${label(key)} failed: ${shortErr(e)}`);
    }
  };
  const confirm = async ({ key, hash }: { key: StepKey; hash: Hex }) => {
    const r = await waitForReceipt(client, hash, 120_000, RECEIPT_POLL_MS);
    if (r.status !== "success") {
      hooks.step(key, { status: "error", note: "reverted" });
      throw new JudgeError("tx", `${label(key)} reverted on chain (tx ${hash}).`);
    }
    hooks.step(key, { status: "done" });
    return r;
  };
  const skip = (key: StepKey, note: string) => hooks.step(key, { status: "skipped", note });
  const escrowCall = (fn: "fundInvoice" | "submitMilestone" | "releaseMilestone", args: readonly unknown[]) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    encodeFunctionData({ abi: bullaEscrowAbi, functionName: fn, args } as any);

  // 2. Gas: both top-ups broadcast together up front (nonces assigned locally), receipts awaited together.
  const gasTxs = await Promise.all([
    topUps[0] ? submit("gasFreelancer", "tank", () => send(tankA, tankN, { to: burners.freelancer.address, value: topUps[0], gas: 21_000n })) : (skip("gasFreelancer", "already has gas"), null),
    topUps[1] ? submit("gasClient", "tank", () => send(tankA, tankN, { to: burners.client.address, value: topUps[1], gas: 21_000n })) : (skip("gasClient", "already has gas"), null),
  ]);
  await Promise.all(gasTxs.filter((t): t is { key: StepKey; hash: Hex } => !!t).map(confirm));

  // 3. Local nonces per burner, explicit gas and gas price (no estimate round trips). Dependent steps still wait for their receipt:
  //    circuit -> (open + create together) -> fund -> (submit0 + submit1 together) -> (release0 + release1 together).
  //    The Client's mint + approve are broadcast alongside the Freelancer's circuit mint, and fund is broadcast the moment the
  //    create receipt arrives, without waiting for mint/approve receipts (same sender, lower nonces, so they land first).
  const [cBal, cAllow, now] = await Promise.all([
    ethCall(client, { address: j.token, abi: erc20Abi, functionName: "balanceOf", args: [burners.client.address] }),
    ethCall(client, { address: j.token, abi: erc20Abi, functionName: "allowance", args: [burners.client.address, j.escrow] }),
    client.request({ method: "eth_getBlockByNumber", params: ["latest", false] }) as Promise<{ timestamp: Hex }>,
  ]);
  const due = BigInt(now.timestamp) + 7n * 86_400n;
  const ZERO = "0x0000000000000000000000000000000000000000" as const;

  let container: Address | null = null;
  let containerBeforeP: Promise<bigint> | null = null;
  const freelancerFlow = async () => {
    const mintTx = await submit("circuit", "freelancer", () => send(fwA, fN, { to: processor, data: encodeFunctionData({ abi: mockProcessorAbi, functionName: "mint", args: [] }), gas: GAS.circuit }));
    const r = await confirm(mintTx);
    let circuitId: bigint | null = null;
    for (const log of r.logs) {
      try {
        const ev = decodeEventLog({ abi: mockProcessorAbi, data: log.data, topics: log.topics });
        if (ev.eventName === "Transfer") circuitId = ev.args.tokenId;
      } catch {
        /* other log */
      }
    }
    if (circuitId === null) throw new JudgeError("tx", "Circuit minted but no Transfer event was found.");
    const cid = circuitId;
    // Payouts reach a container only once it is opened (BullaEscrow falls back to the holder otherwise). Opening and billing are independent.
    const createData = encodeFunctionData({
      abi: bullaEscrowAbi,
      functionName: "createInvoice",
      args: [
        {
          buyer: burners.client.address,
          token: j.token,
          amounts: DEMO_MILESTONES.map((m) => m.amount),
          labels: DEMO_MILESTONES.map((m) => m.label),
          dueTimestamp: due,
          processor,
          circuitId: cid,
          payToContainer: true,
          arbiter: ZERO,
          termsHash: keccak256(toBytes("Bulla judge-mode demo scope")),
          memo: "Judge-mode demo: logo, 2 milestones (testnet)",
        },
      ],
    });
    const [openTx, createTx] = await Promise.all([
      submit("open", "freelancer", () => send(fwA, fN, { to: j.tapeout!.opener, data: encodeFunctionData({ abi: openerAbi, functionName: "open", args: [processor, cid] }), gas: GAS.open })),
      submit("create", "freelancer", () => send(fwA, fN, { to: j.escrow, data: createData, gas: GAS.create })),
    ]);
    const [, createRcpt] = await Promise.all([confirm(openTx), confirm(createTx)]);
    let id: bigint | null = null;
    for (const log of createRcpt.logs) {
      try {
        const ev = decodeEventLog({ abi: bullaEscrowAbi, data: log.data, topics: log.topics });
        if (ev.eventName === "InvoiceCreated") id = ev.args.id;
        if (ev.eventName === "CircuitBound") {
          container = ev.args.container;
          hooks.container(ev.args.container, ev.args.circuitId);
        }
      } catch {
        /* other log */
      }
    }
    if (id === null || !container) throw new JudgeError("tx", "Invoice created but no InvoiceCreated/CircuitBound event was found.");
    containerBeforeP = ethCall(client, { address: j.token, abi: erc20Abi, functionName: "balanceOf", args: [container] });
    containerBeforeP.catch(() => undefined);
    hooks.state(id, 1, [0, 0]); // Draft: the create receipt succeeded
    return id;
  };
  const clientFlow = async (created: Promise<bigint>) => {
    const pre: Promise<unknown>[] = [];
    if (cBal >= DEMO_AMOUNT) skip("mint", "already holds DemoUSD");
    else pre.push(confirm(await submit("mint", "client", () => send(cwA, cN, { to: j.token, data: encodeFunctionData({ abi: demoUsdAbi, functionName: "mint", args: [DEMO_AMOUNT] }), gas: GAS.mint }))));
    if (cAllow >= DEMO_AMOUNT) skip("approve", "allowance already set");
    else pre.push(confirm(await submit("approve", "client", () => send(cwA, cN, { to: j.token, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [j.escrow, maxUint256] }), gas: GAS.approve }))));
    const preAll = Promise.all(pre);
    preAll.catch(() => undefined);
    const id = await created;
    const fundTx = await submit("fund", "client", () => send(cwA, cN, { to: j.escrow, data: escrowCall("fundInvoice", [id, ZERO]), gas: GAS.fund }));
    await Promise.all([preAll, confirm(fundTx)]);
    hooks.state(id, 2, [0, 0]); // Funded: the fund receipt succeeded
    return id;
  };
  const created = freelancerFlow();
  created.catch(() => undefined);
  const [id] = await Promise.all([created, clientFlow(created)]);
  const containerAddr = container as Address | null;
  if (!containerAddr) throw new JudgeError("tx", "Circuit container address missing.");
  const containerBefore = await containerBeforeP!;

  // 4. Deliver both milestones together, then release both together. State changes below come from the confirmed receipts;
  //    the final read at the end checks them against the chain.
  const subs = await Promise.all([
    submit("submit0", "freelancer", () => send(fwA, fN, { to: j.escrow, data: escrowCall("submitMilestone", [id, 0n, keccak256(toBytes(`bulla-demo-${id}-1`)), "judge-demo: placeholder delivery, no real file (milestone 1)"]), gas: GAS.submit })),
    submit("submit1", "freelancer", () => send(fwA, fN, { to: j.escrow, data: escrowCall("submitMilestone", [id, 1n, keccak256(toBytes(`bulla-demo-${id}-2`)), "judge-demo: placeholder delivery, no real file (milestone 2)"]), gas: GAS.submit })),
  ]);
  await Promise.all(subs.map(confirm));
  hooks.state(id, 2, [1, 1]);
  const rels = await Promise.all([
    submit("release0", "client", () => send(cwA, cN, { to: j.escrow, data: escrowCall("releaseMilestone", [id, 0n]), gas: GAS.release })),
    submit("release1", "client", () => send(cwA, cN, { to: j.escrow, data: escrowCall("releaseMilestone", [id, 1n]), gas: GAS.release })),
  ]);
  await Promise.all(rels.map(confirm));
  hooks.state(id, 3, [2, 2]);

  // 5. Verify against the chain (the load-balanced RPC may lag one block, so reads retry fast and briefly).
  const [inv, ms] = await settled(async () => {
    const r = await Promise.all([
      ethCall(client, { address: j.escrow, abi: bullaEscrowAbi, functionName: "getInvoice", args: [id] }),
      ethCall(client, { address: j.escrow, abi: bullaEscrowAbi, functionName: "getMilestones", args: [id] }),
    ]);
    if (Number(r[0].state) < 3 || r[1].some((m) => Number(m.state) < 2)) throw new Error("stale read");
    return r;
  });
  hooks.state(id, Number(inv.state), ms.map((m) => Number(m.state)));
  const containerAfter = await settled(
    async () => {
      const v = await ethCall(client, { address: j.token, abi: erc20Abi, functionName: "balanceOf", args: [containerAddr] });
      if (v <= containerBefore) throw new Error("stale read");
      return v;
    },
    15,
  ).catch(() => ethCall(client, { address: j.token, abi: erc20Abi, functionName: "balanceOf", args: [containerAddr] }));
  return { invoiceId: id, ms: Math.round(performance.now() - t0), container: containerAddr, containerReceived: containerAfter - containerBefore };
}

const flight = new SingleFlight();
const nonceBook = new NonceBook();
const TAB_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);
const lockKey = (b: Burners) => `bulla.judge.lock.${b.freelancer.address.toLowerCase()}`;
const kv = (): KV | null => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};

/** True while a run is active in this tab (synchronous, independent of React state). */
export const isDemoRunning = () => flight.busy;

/**
 * Runs the one-tap demo. Single-flight per tab: a call made while a run is active returns that run's result and starts nothing,
 * so two quick taps can never share wallets and nonce counters. A localStorage lease also stops a second tab that uses the
 * same demo wallets ("A demo is already running in another tab.").
 */
export function runDemo(burners: Burners, hooks: Hooks) {
  return flight.run(async () => {
    const store = kv();
    const k = lockKey(burners);
    if (store && !tryAcquireTabLock(store, k, TAB_ID)) throw new JudgeError("busy", "A demo is already running in another tab.");
    const beat = store ? setInterval(() => heartbeatTabLock(store, k, TAB_ID), TAB_LOCK_BEAT_MS) : null;
    try {
      return await runDemoInner(burners, hooks);
    } finally {
      if (beat) clearInterval(beat);
      if (store) releaseTabLock(store, k, TAB_ID);
    }
  });
}

export function fmtOkb(wei: bigint) {
  const s = (Number(wei) / 1e18).toFixed(6);
  return s.replace(/0+$/, "").replace(/\.$/, "");
}

function shortErr(e: unknown) {
  const x = e as { shortMessage?: string; message?: string };
  return (x.shortMessage || x.message || String(e)).split("\n")[0].slice(0, 200);
}
