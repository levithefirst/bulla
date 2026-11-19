/**
 * Judge-mode gas relayer (Vercel Node function, project bulla-judge, served at /api/gas).
 * The demo gas-tank key lives only in the DEMO_GAS_TANK_KEY environment variable on Vercel; it is never in the browser bundle.
 *
 *   GET  /api/gas                               -> { address, balance, perRun, runsLeft, chainId }
 *   POST /api/gas { freelancer, client }        -> { gasPrice, freelancer: hash | null, client: hash | null }
 *
 * Testnet only (refuses unless the RPC reports chain 1952). Per-IP and per-instance rate limits, and a per-run cap.
 * Bundled to a single file by scripts/build-relayer.ts (esbuild), so the deployed function has no install step.
 */
import { keccak256, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { isAddr, perRunCost, planTopUps, RateLimiter, TANK_TRANSFER_GAS } from "../../shared/judgeRelay";

const CHAIN_ID = 1952;
const RPCS = ["https://testrpc.xlayer.tech/terigon", "https://xlayertestrpc.okx.com/terigon"];
const ALLOWED_ORIGINS = (process.env.DEMO_ALLOWED_ORIGINS ?? "https://try-usebulla.vercel.app").split(",").map((s) => s.trim());
const perIp = new RateLimiter(4, 10 * 60_000);
const global = new RateLimiter(60, 60 * 60_000);

async function rpc(method: string, params: unknown[] = []): Promise<unknown> {
  let last: unknown;
  for (const url of RPCS) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
      const j = (await r.json()) as { result?: unknown; error?: { message?: string } };
      if (j.error) throw new Error(j.error.message ?? "RPC error");
      return j.result;
    } catch (e) {
      last = e;
      // A rejected broadcast is an answer, not an outage: do not resend it to the second node.
      if (method === "eth_sendRawTransaction") throw e;
    }
  }
  throw last;
}
const big = async (method: string, params: unknown[] = []) => BigInt((await rpc(method, params)) as Hex);

let lane: Promise<unknown> = Promise.resolve();
/** One send at a time per instance, so this instance never hands out a nonce twice. */
const serial = <T>(job: () => Promise<T>): Promise<T> => {
  const p = lane.catch(() => undefined).then(job);
  lane = p;
  return p;
};
const NONCE_ERR = /nonce too low|already known|replacement transaction underpriced|nonce has already been used/i;

type Req = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
type Res = { status(n: number): Res; setHeader(k: string, v: string): void; json(v: unknown): void; end(): void };
const header = (req: Req, k: string) => {
  const v = req.headers[k];
  return Array.isArray(v) ? v[0] : v;
};

export default async function handler(req: Req, res: Res) {
  res.setHeader("cache-control", "no-store");
  const key = process.env.DEMO_GAS_TANK_KEY;
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) return res.status(503).json({ code: "tankMissing", error: "The demo gas tank is not configured on the server." });
  const tank = privateKeyToAccount(key as Hex);
  try {
    if (Number(await big("eth_chainId")) !== CHAIN_ID) return res.status(503).json({ code: "chain", error: "The relayer RPC is not X Layer testnet. Refusing to send." });
    if (req.method === "GET") {
      const [balance, gp] = await Promise.all([big("eth_getBalance", [tank.address, "latest"]), big("eth_gasPrice")]);
      const perRun = perRunCost(gp);
      return res.status(200).json({ chainId: CHAIN_ID, address: tank.address, balance: balance.toString(), perRun: perRun.toString(), runsLeft: perRun > 0n ? Number(balance / perRun) : 0 });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Use GET or POST." });
    const origin = header(req, "origin");
    if (origin && !ALLOWED_ORIGINS.includes(origin)) return res.status(403).json({ code: "origin", error: "This relayer only serves the Bulla judge demo." });
    const body = (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {}) as { freelancer?: unknown; client?: unknown };
    if (!isAddr(body.freelancer) || !isAddr(body.client) || body.freelancer.toLowerCase() === body.client.toLowerCase())
      return res.status(400).json({ code: "input", error: "Send two different demo wallet addresses." });
    const ip = (header(req, "x-forwarded-for") ?? "unknown").split(",")[0].trim();
    const wait = perIp.take(ip) || global.take("all");
    if (wait) {
      res.setHeader("retry-after", String(Math.ceil(wait / 1000)));
      return res.status(429).json({ code: "rate", error: `Too many demo runs from here. Try again in about ${Math.ceil(wait / 60_000)} min.` });
    }
    const [gp, fb, cb, tb] = await Promise.all([
      big("eth_gasPrice"),
      big("eth_getBalance", [body.freelancer, "latest"]),
      big("eth_getBalance", [body.client, "latest"]),
      big("eth_getBalance", [tank.address, "latest"]),
    ]);
    const plan = planTopUps(gp, [fb, cb]);
    if (plan.topUps[0] + plan.topUps[1] > plan.cap) return res.status(409).json({ code: "cap", error: "This run would exceed the per-run gas cap. Nothing was sent." });
    if (plan.spend > tb) return res.status(503).json({ code: "tankEmpty", error: "The demo gas tank is empty. Nothing was sent. Try again later, or use your own wallet." });
    const sendTo = (to: string, value: bigint) =>
      serial(async () => {
        for (let attempt = 0; ; attempt++) {
          const nonce = Number(await big("eth_getTransactionCount", [tank.address, "pending"]));
          const raw = await tank.signTransaction({ type: "legacy", chainId: CHAIN_ID, to: to as Hex, value, gas: TANK_TRANSFER_GAS, gasPrice: plan.gasPrice, nonce });
          try {
            await rpc("eth_sendRawTransaction", [raw]);
            return keccak256(raw);
          } catch (e) {
            if (attempt >= 2 || !NONCE_ERR.test(String((e as Error).message))) throw e;
            await new Promise((r) => setTimeout(r, 400));
          }
        }
      });
    const freelancer = plan.topUps[0] > 0n ? await sendTo(body.freelancer, plan.topUps[0]) : null;
    const client = plan.topUps[1] > 0n ? await sendTo(body.client, plan.topUps[1]) : null;
    return res.status(200).json({ gasPrice: plan.gasPrice.toString(), freelancer, client });
  } catch (e) {
    return res.status(502).json({ code: "rpc", error: `Relayer error: ${String((e as Error).message ?? e).slice(0, 160)}` });
  }
}
