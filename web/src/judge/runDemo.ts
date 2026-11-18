/**
 * One-tap judge-mode milestone escrow on X Layer TESTNET (1952), or the local CI node (31337).
 * Every step is a real transaction signed by an in-browser burner key:
 *   gas tank -> burners (testnet OKB), Freelancer mints a stand-in TapeOut circuit, Client mints DemoUSD
 *   and approves, Freelancer creates a 2-milestone invoice paid into the circuit's container, Client funds,
 *   Freelancer submits both milestones, Client releases both: the DemoUSD lands in the container.
 * TapeOut has no testnet deployment, so the circuit, opener and factory are labelled stand-ins.
 * Each sender's transactions are submitted in nonce order; receipts are awaited in parallel.
 */
import { createWalletClient, decodeEventLog, encodeFunctionData, erc20Abi, http, keccak256, maxUint256, parseUnits, toBytes, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bullaEscrowAbi } from "../abi/bullaEscrow";
import { mockProcessorAbi } from "../abi/mockProcessor";
import { config } from "../config";
import { client } from "../lib/client";
import { ethCall, waitForReceipt } from "../../../shared/rpc";
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

const demoUsdAbi = [{ type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] }] as const;

export type StepKey = "gasFreelancer" | "gasClient" | "circuit" | "mint" | "approve" | "create" | "fund" | "submit0" | "submit1" | "release0" | "release1";
export type StepStatus = "idle" | "running" | "done" | "skipped" | "error";
export type Step = { key: StepKey; label: string; role: Role | "tank"; status: StepStatus; hash?: Hex; note?: string };

export const STEPS: Omit<Step, "status">[] = [
  { key: "gasFreelancer", label: "Gas tank sends testnet OKB to the Freelancer", role: "tank" },
  { key: "gasClient", label: "Gas tank sends testnet OKB to the Client", role: "tank" },
  { key: "circuit", label: "Freelancer mints a circuit (testnet stand-in for TapeOut)", role: "freelancer" },
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
    public code: "chain" | "notDeployed" | "tankMissing" | "tankEmpty" | "cap" | "tx",
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
  const perRun = gp * GAS_UNITS_PER_ROLE * 2n + gp * 21_000n * 2n;
  return { address: a, balance: b, perRun, runsLeft: perRun > 0n ? Number(b / perRun) : 0 };
}

export async function runDemo(burners: Burners, hooks: Hooks): Promise<{ invoiceId: bigint; ms: number; container: Address; containerReceived: bigint }> {
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
  const transport = http(config.rpcUrl);
  const tank = createWalletClient({ account: privateKeyToAccount(tk), chain, transport });
  const fw = createWalletClient({ account: privateKeyToAccount(burners.freelancer.privateKey), chain, transport });
  const cw = createWalletClient({ account: privateKeyToAccount(burners.client.privateKey), chain, transport });

  const gasPrice = await gasPriceNow();
  const need = gasPrice * GAS_UNITS_PER_ROLE;
  const [fb, cb, tb] = await Promise.all([balance(burners.freelancer.address), balance(burners.client.address), balance(tank.account.address)]);
  const topUps = [fb < need ? need - fb : 0n, cb < need ? need - cb : 0n];
  const spend = topUps[0] + topUps[1] + gasPrice * 21_000n * 2n;
  const cap = runCapWei(gasPrice);
  if (topUps[0] + topUps[1] > cap) {
    throw new JudgeError("cap", `This run would need ${fmtOkb(topUps[0] + topUps[1])} testnet OKB from the demo tank, above the per-run cap of ${fmtOkb(cap)}. Nothing was sent. Gas may be unusually expensive; try again later.`);
  }
  if ((topUps[0] || topUps[1]) && tb < spend) {
    throw new JudgeError("tankEmpty", `Demo gas tank empty: it holds ${fmtOkb(tb)} testnet OKB and this run needs ${fmtOkb(spend)}. Nothing was sent. Try again later, or use your own wallet.`);
  }

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
    const r = await waitForReceipt(client, hash, 120_000, 150);
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

  // 2. Gas: tank -> burners.
  const tn = await nonceOf(tank.account.address);
  const gasTxs: { key: StepKey; hash: Hex }[] = [];
  let i = 0;
  if (topUps[0]) gasTxs.push(await submit("gasFreelancer", "tank", () => tank.sendTransaction({ to: burners.freelancer.address, value: topUps[0], nonce: tn + i++ })));
  else skip("gasFreelancer", "already has gas");
  if (topUps[1]) gasTxs.push(await submit("gasClient", "tank", () => tank.sendTransaction({ to: burners.client.address, value: topUps[1], nonce: tn + i++ })));
  else skip("gasClient", "already has gas");
  await Promise.all(gasTxs.map(confirm));

  // 3. Freelancer: mint circuit -> create invoice. Client in parallel: mint DemoUSD -> approve.
  const [cBal, cAllow, cn, now] = await Promise.all([
    ethCall(client, { address: j.token, abi: erc20Abi, functionName: "balanceOf", args: [burners.client.address] }),
    ethCall(client, { address: j.token, abi: erc20Abi, functionName: "allowance", args: [burners.client.address, j.escrow] }),
    nonceOf(burners.client.address),
    client.request({ method: "eth_getBlockByNumber", params: ["latest", false] }) as Promise<{ timestamp: Hex }>,
  ]);
  const due = BigInt(now.timestamp) + 7n * 86_400n;
  let cNonce = cn;

  const freelancerChain = async () => {
    const r = await send("circuit", "freelancer", () => fw.sendTransaction({ to: processor, data: encodeFunctionData({ abi: mockProcessorAbi, functionName: "mint", args: [] }) }));
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
    const data = encodeFunctionData({
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
          circuitId,
          payToContainer: true,
          arbiter: "0x0000000000000000000000000000000000000000",
          termsHash: keccak256(toBytes("Bulla judge-mode demo scope")),
          memo: "Judge-mode demo: logo, 2 milestones (testnet)",
        },
      ],
    });
    return send("create", "freelancer", () => fw.sendTransaction({ to: j.escrow, data }));
  };
  const clientChain = async () => {
    const txs: { key: StepKey; hash: Hex }[] = [];
    if (cBal >= DEMO_AMOUNT) skip("mint", "already holds DemoUSD");
    else txs.push(await submit("mint", "client", () => cw.sendTransaction({ to: j.token, data: encodeFunctionData({ abi: demoUsdAbi, functionName: "mint", args: [DEMO_AMOUNT] }), nonce: cNonce++, gas: 120_000n })));
    if (cAllow >= DEMO_AMOUNT) skip("approve", "allowance already set");
    else txs.push(await submit("approve", "client", () => cw.sendTransaction({ to: j.token, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [j.escrow, maxUint256] }), nonce: cNonce++, gas: 80_000n })));
    await Promise.all(txs.map(confirm));
  };
  const send = async (key: StepKey, role: Role | "tank", fn: () => Promise<Hex>) => confirm(await submit(key, role, fn));
  const [createRcpt] = await Promise.all([freelancerChain(), clientChain()]);

  let invoiceId: bigint | null = null;
  for (const log of createRcpt.logs) {
    try {
      const ev = decodeEventLog({ abi: bullaEscrowAbi, data: log.data, topics: log.topics });
      if (ev.eventName === "InvoiceCreated") invoiceId = ev.args.id;
      if (ev.eventName === "CircuitBound") hooks.container(ev.args.container, ev.args.circuitId);
    } catch {
      /* other log */
    }
  }
  if (invoiceId === null) throw new JudgeError("tx", "Invoice created but no InvoiceCreated event was found.");
  const id = invoiceId;
  const inv0 = await ethCall(client, { address: j.escrow, abi: bullaEscrowAbi, functionName: "getInvoice", args: [id] });
  const container = inv0.container;
  const containerBefore = await ethCall(client, { address: j.token, abi: erc20Abi, functionName: "balanceOf", args: [container] });
  const readState = async () => {
    const [inv, ms] = await Promise.all([
      ethCall(client, { address: j.escrow, abi: bullaEscrowAbi, functionName: "getInvoice", args: [id] }),
      ethCall(client, { address: j.escrow, abi: bullaEscrowAbi, functionName: "getMilestones", args: [id] }),
    ]);
    hooks.state(id, Number(inv.state), ms.map((m) => Number(m.state)));
  };
  await readState();

  // 4. Lock, then deliver both milestones (pipelined), then release both (pipelined).
  await send("fund", "client", () => cw.sendTransaction({ to: j.escrow, data: escrowCall("fundInvoice", [id, "0x0000000000000000000000000000000000000000"]) }));
  await readState();
  const fn = await nonceOf(burners.freelancer.address);
  const subs = [
    await submit("submit0", "freelancer", () => fw.sendTransaction({ to: j.escrow, data: escrowCall("submitMilestone", [id, 0n, keccak256(toBytes(`bulla-demo-${id}-1`)), "ipfs://bulla-judge-demo/concepts"]), nonce: fn, gas: 200_000n })),
    await submit("submit1", "freelancer", () => fw.sendTransaction({ to: j.escrow, data: escrowCall("submitMilestone", [id, 1n, keccak256(toBytes(`bulla-demo-${id}-2`)), "ipfs://bulla-judge-demo/final"]), nonce: fn + 1, gas: 200_000n })),
  ];
  await Promise.all(subs.map(confirm));
  await readState();
  const cn2 = await nonceOf(burners.client.address);
  const rels = [
    await submit("release0", "client", () => cw.sendTransaction({ to: j.escrow, data: escrowCall("releaseMilestone", [id, 0n]), nonce: cn2, gas: 250_000n })),
    await submit("release1", "client", () => cw.sendTransaction({ to: j.escrow, data: escrowCall("releaseMilestone", [id, 1n]), nonce: cn2 + 1, gas: 250_000n })),
  ];
  await Promise.all(rels.map(confirm));
  await readState();
  const containerAfter = await ethCall(client, { address: j.token, abi: erc20Abi, functionName: "balanceOf", args: [container] });
  return { invoiceId: id, ms: Math.round(performance.now() - t0), container, containerReceived: containerAfter - containerBefore };
}

export function fmtOkb(wei: bigint) {
  const s = (Number(wei) / 1e18).toFixed(6);
  return s.replace(/0+$/, "").replace(/\.$/, "");
}

function shortErr(e: unknown) {
  const x = e as { shortMessage?: string; message?: string };
  return (x.shortMessage || x.message || String(e)).split("\n")[0].slice(0, 200);
}
