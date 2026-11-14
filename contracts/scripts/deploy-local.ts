/**
 * Local deploy (Hardhat node / anvil-compatible at http://127.0.0.1:8545).
 * Uses the node's built-in throwaway dev accounts. Never touches a real key.
 *
 *   npm run node          # terminal 1
 *   npm run deploy:local  # terminal 2
 *
 * Deploys MockERC20 (mUSDC, 6 decimals) + BullaEscrow, mints test balances,
 * optionally creates a fixture invoice, and writes contracts/deployments.json.
 */
import { ethers, network } from "hardhat";
import { writeDeployment } from "./deployments";

// Local-only fixture container id. NOT a real TapeOut container (see docs/tapeout-binding.md).
export const FIXTURE_CONTAINER_ID = ethers.zeroPadValue("0x00000000000000000000000000000000b0110a00", 32);

async function main() {
  if (network.name !== "localhost" && network.name !== "hardhat") {
    throw new Error(`deploy-local refuses network "${network.name}". Use deploy-xlayer.ts for X Layer.`);
  }
  const signers = await ethers.getSigners();
  const [deployer, seller, buyer, feeRecipient] = signers;
  const feeBps = Number(process.env.FEE_BPS ?? 50);

  const Token = await ethers.getContractFactory("MockERC20");
  const token = await Token.deploy("Mock USDC", "mUSDC", 6);
  await token.waitForDeployment();

  const Escrow = await ethers.getContractFactory("BullaEscrow");
  const escrow = await Escrow.deploy(await token.getAddress(), feeRecipient.address, feeBps, deployer.address);
  await escrow.waitForDeployment();
  const receipt = await escrow.deploymentTransaction()!.wait();

  // Fund the first 6 dev accounts with 10,000 mUSDC each.
  for (const s of signers.slice(0, 6)) await (await token.mint(s.address, 10_000n * 10n ** 6n)).wait();

  if (process.env.SEED_FIXTURE_INVOICE !== "0") {
    const due = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    await (
      await escrow
        .connect(seller)
        .createInvoice(buyer.address, await token.getAddress(), 250n * 10n ** 6n, due, ethers.ZeroHash, FIXTURE_CONTAINER_ID, "Fixture: logo design, milestone 1")
    ).wait();
  }

  const net = await ethers.provider.getNetwork();
  writeDeployment({
    network: "localhost",
    chainId: Number(net.chainId),
    escrow: await escrow.getAddress(),
    token: await token.getAddress(),
    tokenSymbol: "mUSDC",
    tokenDecimals: 6,
    feeRecipient: feeRecipient.address,
    feeBps,
    deployedAt: new Date().toISOString(),
    deployBlock: receipt?.blockNumber ?? null,
    note: "Local dev only. Dev accounts: #1 seller, #2 buyer, #3 feeRecipient.",
  });
  console.log({ escrow: await escrow.getAddress(), token: await token.getAddress(), seller: seller.address, buyer: buyer.address });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
