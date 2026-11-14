import { encodeFunctionData, type Abi, type Address, type ContractFunctionArgs, type ContractFunctionName, type Hex } from "viem";
import { config } from "../config";
import { client } from "./client";
import { ethCall } from "./rpc";
import type { Eip1193 } from "./wallet";

/**
 * Send a contract write through the connected wallet:
 * 1. check the wallet is on config.chain,
 * 2. simulate with eth_call from the user's address so a revert shows its decoded reason,
 * 3. eth_sendTransaction (the wallet estimates gas and signs).
 */
export async function sendWrite<const abi extends Abi, fn extends ContractFunctionName<abi, "nonpayable" | "payable">>(
  wallet: { provider?: Eip1193; address?: Address },
  req: { address: Address; abi: abi; functionName: fn; args: ContractFunctionArgs<abi, "nonpayable" | "payable", fn> },
): Promise<Hex> {
  const { provider, address } = wallet;
  if (!provider || !address) throw new Error("Connect a wallet first.");
  const chainId = Number(await provider.request({ method: "eth_chainId" }));
  if (chainId !== config.chain.id) throw new Error(`Your wallet is on chain ${chainId}. Switch to ${config.chain.name} (chain ${config.chain.id}).`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await ethCall(client, { ...req, from: address } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = encodeFunctionData({ abi: req.abi, functionName: req.functionName, args: req.args } as any);
  return (await provider.request({ method: "eth_sendTransaction", params: [{ from: address, to: req.address, data }] })) as Hex;
}
