/**
 * One-tap judge-mode escrow on X Layer TESTNET (1952), or the local CI node (31337).
 * Every step is a real transaction signed by an in-browser burner key:
 *   gas tank -> burners (testnet OKB), mint DemoUSD, approve, create invoice,
 *   fund (lock), submit delivery, release.
 * Independent transactions are sent in parallel to keep the loop short.
 */
import { createWalletClient, decodeEventLog, encodeFunctionData, erc20Abi, http, keccak256, maxUint256, pad, parseUnits, toBytes, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bullaEscrowAbi } from "../abi/bullaEscrow";
import { config } from "../config";
import { client } from "../lib/client";
import { ethCall, waitForReceipt } from "../../../shared/rpc";
import type { Burners, Role } from "./burners";

export const DEMO_AMOUNT = parseUnits("250", 6);
/** Not a TapeOut container: TapeOut has no published X Layer testnet deployment (docs/research.md). */
export const DEMO_CONTAINER_ID = pad("0x00000000000000000000000000000000b0110a00", { size: 32 });
const GAS_UNITS_PER_ROLE = 700_000n;

const demoUsdAbi = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
] as const;

export type StepKey = "gasFreelancer" | "gasClient" | "mint" | "approve" | "create" | "fund" | "submit" | "release";
export type StepStatus = "idle" | "running" | "done" | "skipped" | "error";
export type Step = { key: StepKey; label: string; role: Role | "tank"; status: StepStatus; hash?: Hex; note?: string };

export const STEPS: Omit<Step, "status">[] = [
  { key: "gasFreelancer", label: "Gas tank sends testnet OKB to the Freelancer", role: "tank" },
  { key: "gasClient", label: "Gas tank sends testnet OKB to the Client", role: "tank" },
  { key: "mint", label: "Client mints 250 DemoUSD", role: "client" },
  { key: "approve", label: "Client approves the escrow to pull DemoUSD", role: "client" },
  { key: "create", label: "Freelancer creates the invoice", role: "freelancer" },
  { key: "fund", label: "Client funds it: 250 DemoUSD locked in escrow", role: "client" },
  { key: "submit", label: "Freelancer submits the delivery hash", role: "freelancer" },
  { key: "release", label: "Client approves the work and releases", role: "client" },
];

export class JudgeError extends Error {
  constructor(
    public code: "chain" | "notDeployed" | "tankMissing" | "tankEmpty" | "tx",
    message: string,
  ) {
    super(message);
  }
}

export type Hooks = {
  step(key: StepKey, patch: Partial<Step>): void;
  state(invoiceId: bigint, state: number): void;
  active(role: Role | "tank"): void;
};

const allowedChain = () => config.chain.id === 1952 || (config.chain.id === 31337 && config.networkKey === "localhost");

export function tankKey(): Hex | null {
  const k = import.meta.env.VITE_DEMO_GAS_TANK_KEY;
  return k && /^0x[0-9a-fA-F]{64}$/.test(k) ? (k as Hex) : null;
}

const balance = async (a: Address) => BigInt((await client.request({ method: "eth_getBalance", params: [a, "latest"] })) as Hex);
const nonceOf = async (a: Address) => Number(BigInt((await client.request({ method: "eth_getTransactionCount", params: [a, "pending"] })) as Hex));

export async function runDemo(burners: Burners, hooks: Hooks): Promise<{ invoiceId: bigint; ms: number }> {
  const t0 = performance.now();
  // 1. Guards: testnet (or local CI) only, contracts present, tank configured and funded.
  if (!allowedChain()) throw new JudgeError("chain", `Judge mode runs only on X Layer testnet (chain 1952). This build targets ${config.chain.name} (${config.chain.id}).`);
  const rpcChain = Number(BigInt((await client.request({ method: "eth_chainId" })) as Hex));
  if (rpcChain !== config.chain.id) throw new JudgeError("chain", `The RPC reports chain ${rpcChain}, expected ${config.chain.id}. Refusing to run.`);
  const j = config.judge;
  if (!j) throw new JudgeError("notDeployed", "The judge-mode escrow is not deployed on this network yet.");
  const tk = tankKey();
  if (!tk) throw new JudgeError("tankMissing", "This build has no demo gas tank configured.");

  const chain = config.chain;
  const transport = http(config.rpcUrl);
  const tank = createWalletClient({ account: privateKeyToAccount(tk), chain, transport });
  const fw = createWalletClient({ account: privateKeyToAccount(burners.freelancer.privateKey), chain, transport });
  const cw = createWalletClient({ account: privateKeyToAccount(burners.client.privateKey), chain, transport });

  const gasPrice = BigInt((await client.request({ method: "eth_gasPrice" })) as Hex);
  const need = gasPrice * GAS_UNITS_PER_ROLE * 2n; // 2x buffer for price moves
  const [fb, cb, tb] = await Promise.all([balance(burners.freelancer.address), balance(burners.client.address), balance(tank.account.address)]);
  const topUps = [fb < need ? need : 0n, cb < need ? need : 0n];
  const tankNeeds = topUps[0] + topUps[1] + gasPrice * 21_000n * 4n;
  if ((topUps[0] || topUps[1]) && tb < tankNeeds) {
    throw new JudgeError("tankEmpty", `Demo gas tank empty: it holds ${fmtOkb(tb)} testnet OKB and this run needs ${fmtOkb(tankNeeds)}. Nothing was sent. Try again later, or use your own wallet.`);
  }

  const label = (key: StepKey) => STEPS.find((s) => s.key === key)!.label;
  // submit() broadcasts and returns as soon as the node has the tx; confirm() waits for the receipt.
  // Each sender's transactions are submitted in nonce order; receipts are awaited in parallel.
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
  const send = async (key: StepKey, role: Role | "tank", fn: () => Promise<Hex>) => confirm(await submit(key, role, fn));
  const skip = (key: StepKey, note: string) => hooks.step(key, { status: "skipped", note });

  // 2. Gas: tank -> burners. Submitted in nonce order, confirmed together.
  const tn = await nonceOf(tank.account.address);
  const gasTxs: { key: StepKey; hash: Hex }[] = [];
  let i = 0;
  if (topUps[0]) gasTxs.push(await submit("gasFreelancer", "tank", () => tank.sendTransaction({ to: burners.freelancer.address, value: topUps[0], nonce: tn + i++ })));
  else skip("gasFreelancer", "already has gas");
  if (topUps[1]) gasTxs.push(await submit("gasClient", "tank", () => tank.sendTransaction({ to: burners.client.address, value: topUps[1], nonce: tn + i++ })));
  else skip("gasClient", "already has gas");
  await Promise.all(gasTxs.map(confirm));

  // 3. Freelancer create runs alongside the Client's mint -> approve (submitted in nonce order).
  const [cBal, cAllow, cn, now] = await Promise.all([
    ethCall(client, { address: j.token, abi: erc20Abi, functionName: "balanceOf", args: [burners.client.address] }),
    ethCall(client, { address: j.token, abi: erc20Abi, functionName: "allowance", args: [burners.client.address, j.escrow] }),
    nonceOf(burners.client.address),
    client.request({ method: "eth_getBlockByNumber", params: ["latest", false] }) as Promise<{ timestamp: Hex }>,
  ]);
  const due = BigInt(now.timestamp) + 7n * 86_400n;
  let cNonce = cn;
  const createData = encodeFunctionData({
    abi: bullaEscrowAbi,
    functionName: "createInvoice",
    args: [burners.client.address, j.token, DEMO_AMOUNT, due, keccak256(toBytes("Bulla judge-mode demo scope")), DEMO_CONTAINER_ID, "Judge-mode demo: logo, milestone 1 (testnet)"],
  });
  const clientChain = async () => {
    const txs: { key: StepKey; hash: Hex }[] = [];
    if (cBal >= DEMO_AMOUNT) skip("mint", "already holds DemoUSD");
    else txs.push(await submit("mint", "client", () => cw.sendTransaction({ to: j.token, data: encodeFunctionData({ abi: demoUsdAbi, functionName: "mint", args: [DEMO_AMOUNT] }), nonce: cNonce++, gas: 120_000n })));
    if (cAllow >= DEMO_AMOUNT) skip("approve", "allowance already set");
    else txs.push(await submit("approve", "client", () => cw.sendTransaction({ to: j.token, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [j.escrow, maxUint256] }), nonce: cNonce++, gas: 80_000n })));
    await Promise.all(txs.map(confirm));
  };
  const [createRcpt] = await Promise.all([send("create", "freelancer", () => fw.sendTransaction({ to: j.escrow, data: createData })), clientChain()]);
  let invoiceId: bigint | null = null;
  for (const log of createRcpt.logs) {
    try {
      const ev = decodeEventLog({ abi: bullaEscrowAbi, data: log.data, topics: log.topics });
      if (ev.eventName === "InvoiceCreated") invoiceId = ev.args.id;
    } catch {
      /* other log */
    }
  }
  if (invoiceId === null) throw new JudgeError("tx", "Invoice created but no InvoiceCreated event was found.");
  const id = invoiceId;
  const readState = async () => hooks.state(id, Number((await ethCall(client, { address: j.escrow, abi: bullaEscrowAbi, functionName: "getInvoice", args: [id] })).state));
  await readState();

  // 4. Lock, deliver, release: each depends on the previous one.
  await send("fund", "client", () => cw.sendTransaction({ to: j.escrow, data: encodeFunctionData({ abi: bullaEscrowAbi, functionName: "fundInvoice", args: [id] }) }));
  await readState();
  await send("submit", "freelancer", () => fw.sendTransaction({ to: j.escrow, data: encodeFunctionData({ abi: bullaEscrowAbi, functionName: "submitDelivery", args: [id, keccak256(toBytes(`bulla-demo-delivery-${id}`)), "ipfs://bulla-judge-demo"] }) }));
  await readState();
  await send("release", "client", () => cw.sendTransaction({ to: j.escrow, data: encodeFunctionData({ abi: bullaEscrowAbi, functionName: "releaseFunds", args: [id] }) }));
  await readState();
  return { invoiceId: id, ms: Math.round(performance.now() - t0) };
}

function fmtOkb(wei: bigint) {
  const s = (Number(wei) / 1e18).toFixed(6);
  return s.replace(/0+$/, "").replace(/\.$/, "");
}

function shortErr(e: unknown) {
  const x = e as { shortMessage?: string; message?: string };
  return (x.shortMessage || x.message || String(e)).split("\n")[0].slice(0, 200);
}
