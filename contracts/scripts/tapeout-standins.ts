import { ethers } from "hardhat";
import type { TapeOutBinding } from "../../shared/deployments";

/**
 * Deploy the TapeOut stand-ins (MockTapeOutFactory, MockOpener, MockProcessor) for local and X Layer TESTNET
 * use only. TapeOut has no testnet deployment (docs/research.md section 3). Callers must refuse chain 196.
 */
export async function deployTapeOutStandIns(): Promise<TapeOutBinding> {
  const net = await ethers.provider.getNetwork();
  if (Number(net.chainId) === 196) throw new Error("refusing to deploy TapeOut stand-ins on X Layer mainnet (196)");
  const factory = await (await ethers.getContractFactory("MockTapeOutFactory")).deploy();
  await factory.waitForDeployment();
  const opener = await (await ethers.getContractFactory("MockOpener")).deploy();
  await opener.waitForDeployment();
  const processor = await (await ethers.getContractFactory("MockProcessor")).deploy();
  await processor.waitForDeployment();
  await (await factory.addCpu(await processor.getAddress())).wait();
  return { opener: await opener.getAddress(), factory: await factory.getAddress(), processor: await processor.getAddress(), standIn: true };
}
