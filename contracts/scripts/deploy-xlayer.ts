/**
 * X Layer testnet / mainnet deploy for BullaEscrow.
 *
 *   npm run deploy:testnet   # chainId 1952
 *   npm run deploy:mainnet   # chainId 196
 *
 * A HUMAN must supply the key later via DEPLOYER_PRIVATE_KEY in an untracked .env.
 * Without a key this script only prints a dry-run plan and exits non-zero.
 * It never invents an address: ESCROW_TOKEN and FEE_RECIPIENT must be given.
 *
 * Extra mainnet guards: CONFIRM_MAINNET=I_UNDERSTAND_UNAUDITED must be set, and
 * the token must have been probed (see docs/research.md "Mainnet token decision gate").
 */
import { ethers, network } from "hardhat";
import { writeDeployment } from "./deployments";

const EXPECTED_CHAIN: Record<string, number> = { xlayerTestnet: 1952, xlayerMainnet: 196 };
// From Circle's official list (docs/research.md §2). Used only for a warning, never as a silent default.
const DOCUMENTED_USDC: Record<string, string> = {
  xlayerTestnet: "0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3",
  xlayerMainnet: "0xB6CEceAB302E2E4948951eE7843FC24E92933061",
};

function fail(msg: string): never {
  console.error(`\nREFUSING TO DEPLOY: ${msg}\n`);
  process.exit(1);
}

async function main() {
  const name = network.name;
  if (!(name in EXPECTED_CHAIN)) fail(`network "${name}" is not an X Layer network. Use --network xlayerTestnet|xlayerMainnet.`);

  const token = process.env.ESCROW_TOKEN?.trim() || "";
  const feeRecipient = process.env.FEE_RECIPIENT?.trim() || "";
  const feeBps = Number(process.env.FEE_BPS ?? 50);
  const hasKey = !!process.env.DEPLOYER_PRIVATE_KEY;

  console.log("BullaEscrow deploy plan");
  console.log("  network       :", name, `(expected chainId ${EXPECTED_CHAIN[name]})`);
  console.log("  rpc           :", (network.config as { url?: string }).url);
  console.log("  ESCROW_TOKEN  :", token || "(missing)");
  console.log("  FEE_RECIPIENT :", feeRecipient || "(missing)");
  console.log("  FEE_BPS       :", feeBps);
  console.log("  key present   :", hasKey ? "yes (value not printed)" : "no");

  if (!token || !ethers.isAddress(token)) fail("ESCROW_TOKEN is missing or not an address. No default is invented.");
  if (!feeRecipient || !ethers.isAddress(feeRecipient)) fail("FEE_RECIPIENT is missing or not an address.");
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 1000) fail("FEE_BPS must be an integer 0..1000.");
  if (token.toLowerCase() !== DOCUMENTED_USDC[name].toLowerCase()) {
    console.warn(`  WARNING: ESCROW_TOKEN differs from Circle's documented USDC for ${name} (${DOCUMENTED_USDC[name]}).`);
  }

  if (!hasKey) {
    console.log("\nDRY RUN: no DEPLOYER_PRIVATE_KEY set, nothing was broadcast.");
    console.log("A human must add DEPLOYER_PRIVATE_KEY to an untracked .env and re-run. See docs/HANDOFF.md.");
    process.exit(1);
  }

  if (name === "xlayerMainnet" && process.env.CONFIRM_MAINNET !== "I_UNDERSTAND_UNAUDITED") {
    fail("mainnet requires CONFIRM_MAINNET=I_UNDERSTAND_UNAUDITED (contract is unaudited).");
  }

  const net = await ethers.provider.getNetwork();
  if (Number(net.chainId) !== EXPECTED_CHAIN[name]) fail(`RPC reports chainId ${net.chainId}, expected ${EXPECTED_CHAIN[name]}.`);

  const code = await ethers.provider.getCode(token);
  if (code === "0x") fail(`no contract code at ESCROW_TOKEN ${token} on ${name}.`);
  const erc20 = new ethers.Contract(token, ["function symbol() view returns (string)", "function decimals() view returns (uint8)"], ethers.provider);
  const [symbol, decimals] = await Promise.all([erc20.symbol(), erc20.decimals()]);
  console.log(`  token on chain: ${symbol}, ${decimals} decimals`);

  const [deployer] = await ethers.getSigners();
  console.log("  deployer      :", deployer.address);
  const Escrow = await ethers.getContractFactory("BullaEscrow");
  const escrow = await Escrow.deploy(token, feeRecipient, feeBps, deployer.address);
  await escrow.waitForDeployment();
  const receipt = await escrow.deploymentTransaction()!.wait();
  const address = await escrow.getAddress();
  console.log("  BullaEscrow   :", address, "block", receipt?.blockNumber);

  writeDeployment({
    network: name,
    chainId: Number(net.chainId),
    escrow: address,
    token,
    tokenSymbol: String(symbol),
    tokenDecimals: Number(decimals),
    feeRecipient,
    feeBps,
    deployedAt: new Date().toISOString(),
    deployBlock: receipt?.blockNumber ?? null,
  });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
