import { HardhatUserConfig, subtask } from "hardhat/config";
import { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } from "hardhat/builtin-tasks/task-names";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import * as path from "path";

// Load the repo-root .env if present (never committed). Nothing here requires it.
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Use the solc-js build shipped in the `solc` npm package (pinned to 0.8.24) so a
// fresh clone compiles without downloading from binaries.soliditylang.org.
const SOLC_VERSION = "0.8.24";
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args: { solcVersion: string }, _hre, runSuper) => {
  if (args.solcVersion === SOLC_VERSION) {
    const compilerPath = require.resolve("solc/soljson.js");
    return { compilerPath, isSolcJs: true, version: SOLC_VERSION, longVersion: require("solc/package.json").version };
  }
  return runSuper();
});

// Keys are only read for the X Layer networks, and only if a human supplied one.
// The deploy script refuses to broadcast without it.
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = deployerKey ? [deployerKey] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: SOLC_VERSION,
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: process.env.LOCAL_RPC ?? "http://127.0.0.1:8545", chainId: 31337 },
    // Source: docs/research.md §1 (official X Layer network information page)
    xlayerTestnet: {
      url: process.env.X_LAYER_TESTNET_RPC ?? "https://testrpc.xlayer.tech/terigon",
      chainId: 1952,
      accounts,
    },
    xlayerMainnet: {
      url: process.env.X_LAYER_MAINNET_RPC ?? "https://rpc.xlayer.tech",
      chainId: 196,
      accounts,
    },
  },
};

export default config;
