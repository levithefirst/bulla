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
import { deployTapeOutStandIns } from "./tapeout-standins";


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

  // TapeOut stand-ins (local only); the seller mints stand-in circuit #1.
  const tapeout = await deployTapeOutStandIns();
  const processor = await ethers.getContractAt("MockProcessor", tapeout.processor!);
  await (await processor.connect(seller).mint()).wait();

  const Escrow = await ethers.getContractFactory("BullaEscrow");
  const escrow = await Escrow.deploy(await token.getAddress(), tapeout.opener, tapeout.factory, feeRecipient.address, feeBps, deployer.address);
  await escrow.waitForDeployment();
  const receipt = await escrow.deploymentTransaction()!.wait();

  // Fund the first 6 dev accounts with 10,000 mUSDC each.
  for (const s of signers.slice(0, 6)) await (await token.mint(s.address, 10_000n * 10n ** 6n)).wait();

  if (process.env.SEED_FIXTURE_INVOICE !== "0") {
    const due = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    await (
      await escrow.connect(seller).createInvoice({
        buyer: buyer.address,
        token: await token.getAddress(),
        amounts: [100n * 10n ** 6n, 150n * 10n ** 6n],
        labels: ["Logo concepts", "Final logo files"],
        dueTimestamp: due,
        processor: tapeout.processor!,
        circuitId: 1,
        payToContainer: false,
        arbiter: ethers.ZeroAddress,
        termsHash: ethers.ZeroHash,
        memo: "Fixture: logo design",
      })
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
    tapeout,
    note: "Local dev only. TapeOut stand-ins; seller holds stand-in circuit #1. Dev accounts: #1 seller, #2 buyer, #3 feeRecipient.",
  });
  console.log({ escrow: await escrow.getAddress(), token: await token.getAddress(), seller: seller.address, buyer: buyer.address });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
