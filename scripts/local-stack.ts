/**
 * Hermetic local stack shared by `npm run e2e` and `npm run screenshots`:
 * its own Hardhat node, random throwaway keys (e2e/.keys.json, gitignored) funded with
 * hardhat_setBalance, MockERC20 + BullaEscrow deployed from the throwaway deployer, and a
 * localhost web build served by vite preview. No faucet, no real network, no real key.
 */
import { spawn, spawnSync, type ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { createPublicClient, createWalletClient, http, parseUnits, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

export const root = path.resolve(__dirname, "..");
export type Keys = Record<"deployer" | "seller" | "buyer" | "feeRecipient" | "gasTank", { address: Address; privateKey: Hex }>;
export type Stack = {
  rpc: string;
  baseURL: string;
  escrow: Address;
  token: Address;
  deployBlock: number;
  judge: { escrow: Address; token: Address; deployBlock: number };
  tapeout: { opener: Address; factory: Address; processor: Address };
  keys: Keys;
  stop: () => void;
};

export function sh(cmd: string, args: string[], env: Record<string, string> = {}, cwd = root) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed (${r.status})`);
}

async function waitFor(url: string, body?: string, tries = 80) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, body ? { method: "POST", headers: { "content-type": "application/json" }, body } : undefined);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`timeout waiting for ${url}`);
}

async function assertPortFree(port: number) {
  try {
    await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) });
  } catch (e) {
    if ((e as { cause?: { code?: string } }).cause?.code === "ECONNREFUSED") return;
  }
  throw new Error(`port ${port} is already in use; stop the old process or pick another port`);
}

const artifact = (rel: string) => JSON.parse(fs.readFileSync(path.join(root, "contracts/artifacts/contracts", rel), "utf8"));

export async function startLocalStack(opts: { rpcPort: number; webPort: number; outDir: string; tag: string }): Promise<Stack> {
  const procs: ChildProcess[] = [];
  const stop = () => {
    for (const p of procs.splice(0)) {
      try {
        if (p.pid) process.kill(-p.pid, "SIGTERM"); // whole process group (npx -> sh -> node)
      } catch {
        /* already gone */
      }
    }
  };
  process.on("exit", stop);
  process.on("SIGINT", () => {
    stop();
    process.exit(130);
  });
  try {
    sh("npx", ["tsx", "scripts/gen-test-keys.ts"]);
    const keys = JSON.parse(fs.readFileSync(path.join(root, "e2e/.keys.json"), "utf8")) as Keys;
    sh("npx", ["hardhat", "compile", "--quiet"], {}, path.join(root, "contracts"));

    const RPC = `http://127.0.0.1:${opts.rpcPort}`;
    console.log(`\n[${opts.tag}] starting hardhat node on ${opts.rpcPort}`);
    await assertPortFree(opts.rpcPort);
    await assertPortFree(opts.webPort);
    procs.push(spawn("npx", ["hardhat", "node", "--port", String(opts.rpcPort)], { cwd: path.join(root, "contracts"), stdio: ["ignore", "ignore", "inherit"], detached: true }));
    await waitFor(RPC, JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }));

    const pub = createPublicClient({ chain: hardhat, transport: http(RPC) });
    for (const r of ["deployer", "seller", "buyer", "feeRecipient", "gasTank"] as const) {
      await pub.request({ method: "hardhat_setBalance" as never, params: [keys[r].address, "0x56BC75E2D63100000"] as never }); // 100 ETH
    }
    const deployer = createWalletClient({ chain: hardhat, transport: http(RPC), account: privateKeyToAccount(keys.deployer.privateKey) });
    const tokenArt = artifact("mocks/MockERC20.sol/MockERC20.json");
    const escrowArt = artifact("BullaEscrow.sol/BullaEscrow.json");
    const standIn = (n: string) => artifact(`mocks/MockTapeOutStandIn.sol/${n}.json`);
    const deploy = async (art: { abi: unknown[]; bytecode: Hex }, args: unknown[] = []) =>
      pub.waitForTransactionReceipt({ hash: await deployer.deployContract({ abi: art.abi, bytecode: art.bytecode, args }) });

    // TapeOut stand-ins (TapeOut has no local or testnet deployment); the seller key holds stand-in circuit #1.
    const factoryArt = standIn("MockTapeOutFactory");
    const processorArt = standIn("MockProcessor");
    const tapeout = {
      factory: (await deploy(factoryArt)).contractAddress!,
      opener: (await deploy(standIn("MockOpener"))).contractAddress!,
      processor: (await deploy(processorArt)).contractAddress!,
    };
    await pub.waitForTransactionReceipt({ hash: await deployer.writeContract({ address: tapeout.factory, abi: factoryArt.abi, functionName: "addCpu", args: [tapeout.processor] }) });
    const seller = createWalletClient({ chain: hardhat, transport: http(RPC), account: privateKeyToAccount(keys.seller.privateKey) });
    await pub.waitForTransactionReceipt({ hash: await seller.writeContract({ address: tapeout.processor, abi: processorArt.abi, functionName: "mint", args: [] }) });

    const token = (await deploy(tokenArt, ["Mock USDC", "mUSDC", 6])).contractAddress!;
    const escrowRcpt = await deploy(escrowArt, [token, tapeout.opener, tapeout.factory, keys.feeRecipient.address, 50, keys.deployer.address]);
    const escrow = escrowRcpt.contractAddress!;
    await pub.waitForTransactionReceipt({ hash: await deployer.writeContract({ address: token, abi: tokenArt.abi, functionName: "mint", args: [keys.buyer.address, parseUnits("100000", 6)] }) });
    console.log(`[${opts.tag}] token ${token}\n[${opts.tag}] escrow ${escrow}\n[${opts.tag}] stand-in processor ${tapeout.processor}`);

    // Judge mode: DemoUSD + an escrow bound to the same stand-ins (local stand-in for the testnet judge deployment).
    const demo = (await deploy(artifact("DemoUSD.sol/DemoUSD.json"))).contractAddress!;
    const jRcpt = await deploy(escrowArt, [demo, tapeout.opener, tapeout.factory, keys.feeRecipient.address, 50, keys.deployer.address]);
    const judge = { escrow: jRcpt.contractAddress!, token: demo, deployBlock: Number(jRcpt.blockNumber) };
    console.log(`[${opts.tag}] judge DemoUSD ${demo}\n[${opts.tag}] judge escrow ${judge.escrow}`);

    sh(
      "npx",
      ["vite", "build", "--outDir", opts.outDir, "--emptyOutDir"],
      {
        VITE_BULLA_NETWORK: "localhost",
        VITE_ESCROW_ADDRESS: escrow,
        VITE_ESCROW_TOKEN: token,
        VITE_RPC_URL: RPC,
        VITE_DEPLOY_BLOCK: String(escrowRcpt.blockNumber),
        VITE_JUDGE_ESCROW_ADDRESS: judge.escrow,
        VITE_JUDGE_TOKEN: judge.token,
        VITE_JUDGE_DEPLOY_BLOCK: String(judge.deployBlock),
        VITE_TAPEOUT_OPENER: tapeout.opener,
        VITE_TAPEOUT_FACTORY: tapeout.factory,
        VITE_TAPEOUT_PROCESSOR: tapeout.processor,
        VITE_JUDGE_TAPEOUT_OPENER: tapeout.opener,
        VITE_JUDGE_TAPEOUT_FACTORY: tapeout.factory,
        VITE_JUDGE_TAPEOUT_PROCESSOR: tapeout.processor,
        // Throwaway LOCAL gas tank (from gitignored e2e/.keys.json), passed only via env, never written to a file in git.
        VITE_DEMO_GAS_TANK_KEY: keys.gasTank.privateKey,
        VITE_MOCK: "0",
      },
      path.join(root, "web"),
    );
    procs.push(spawn("npx", ["vite", "preview", "--outDir", opts.outDir, "--port", String(opts.webPort), "--strictPort"], { cwd: path.join(root, "web"), stdio: ["ignore", "ignore", "inherit"], detached: true }));
    const baseURL = `http://127.0.0.1:${opts.webPort}/`;
    await waitFor(baseURL);
    return { rpc: RPC, baseURL, escrow, token, deployBlock: Number(escrowRcpt.blockNumber), judge, tapeout, keys, stop };
  } catch (e) {
    stop();
    throw e;
  }
}
