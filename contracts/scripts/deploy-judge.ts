/**
 * Judge-mode deploy: DemoUSD + a BullaEscrow bound to DemoUSD, on X Layer TESTNET (1952) only.
 *   npm run deploy:judge     (hardhat --network xlayerTestnet)
 * Real-token mode (USDC) is untouched; this writes contracts/deployments.json xlayerTestnet.judge.
 *
 * A human or Grok Bot supplies DEPLOYER_PRIVATE_KEY (testnet-only wallet) in an untracked .env.
 * Without it this prints a dry-run plan and exits non-zero. Refuses any chain except 1952.
 */
import { ethers, network } from "hardhat";
import { writeJudgeDeployment } from "./deployments";
import { deployTapeOutStandIns } from "./tapeout-standins";

function fail(msg: string): never {
  console.error(`\nREFUSING TO DEPLOY JUDGE MODE: ${msg}\n`);
  process.exit(1);
}

async function main() {
  if (network.name !== "xlayerTestnet") fail(`network "${network.name}": judge mode deploys only to xlayerTestnet (chain 1952).`);
  const feeRecipient = process.env.FEE_RECIPIENT?.trim() || "";
  const feeBps = Number(process.env.FEE_BPS ?? 50);
  const hasKey = !!process.env.DEPLOYER_PRIVATE_KEY;
  console.log("Bulla judge-mode deploy plan (X Layer testnet)");
  console.log("  contracts     : TapeOut stand-ins (MockTapeOutFactory, MockOpener, MockProcessor), DemoUSD, BullaEscrow v2(DemoUSD)");
  console.log("  FEE_RECIPIENT :", feeRecipient || "(missing)");
  console.log("  FEE_BPS       :", feeBps);
  console.log("  key present   :", hasKey ? "yes (value not printed)" : "no");
  if (!feeRecipient || !ethers.isAddress(feeRecipient)) fail("FEE_RECIPIENT is missing or not an address.");
  if (!hasKey) {
    console.log("\nDRY RUN: no DEPLOYER_PRIVATE_KEY set, nothing was broadcast.");
    process.exit(1);
  }
  const net = await ethers.provider.getNetwork();
  if (Number(net.chainId) !== 1952) fail(`RPC reports chainId ${net.chainId}, expected 1952.`);

  const [deployer] = await ethers.getSigners();
  const tapeout = await deployTapeOutStandIns();
  const demo = await (await ethers.getContractFactory("DemoUSD")).deploy();
  await demo.waitForDeployment();
  const escrow = await (await ethers.getContractFactory("BullaEscrow")).deploy(await demo.getAddress(), tapeout.opener, tapeout.factory, feeRecipient, feeBps, deployer.address);
  await escrow.waitForDeployment();
  const rc = await escrow.deploymentTransaction()!.wait();
  console.log("  stand-ins     :", JSON.stringify(tapeout));
  console.log("  DemoUSD       :", await demo.getAddress());
  console.log("  BullaEscrow   :", await escrow.getAddress(), "block", rc?.blockNumber);
  writeJudgeDeployment("xlayerTestnet", {
    escrow: await escrow.getAddress(),
    token: await demo.getAddress(),
    deployBlock: rc!.blockNumber,
    feeRecipient,
    feeBps,
    deployedAt: new Date().toISOString(),
    tapeout,
  });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
