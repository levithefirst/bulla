import * as fs from "fs";
import * as path from "path";
import { EXPECTED_CHAIN_ID, validateEntry, type DeploymentEntry, type DeploymentsFile, type JudgeDeployment, type NetworkKey } from "../../shared/deployments";

export type { DeploymentEntry, DeploymentsFile };

export const DEPLOYMENTS_PATH = process.env.DEPLOYMENTS_PATH ?? path.resolve(__dirname, "../deployments.json");

export function readDeployments(file = DEPLOYMENTS_PATH): DeploymentsFile {
  if (!fs.existsSync(file)) return { networks: {} };
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** Validates against the shared schema the web app reads, then writes. Throws on a bad entry. */
export function writeDeployment(entry: DeploymentEntry, file = DEPLOYMENTS_PATH) {
  const problems = validateEntry(entry);
  if (problems.length) throw new Error(`refusing to write deployments.json: ${problems.join("; ")}`);
  const data = readDeployments(file);
  data.networks[entry.network] = entry;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  console.log(`wrote ${entry.network} -> ${file}`);
}

/** Add or replace the judge-mode block of a network entry, keeping the real-token fields as they are. */
export function writeJudgeDeployment(network: NetworkKey, judge: JudgeDeployment, file = DEPLOYMENTS_PATH) {
  const data = readDeployments(file);
  const base: DeploymentEntry = data.networks[network] ?? {
    network,
    chainId: EXPECTED_CHAIN_ID[network],
    escrow: null,
    token: null,
    tokenSymbol: null,
    tokenDecimals: null,
    feeRecipient: null,
    feeBps: judge.feeBps,
    deployedAt: null,
    deployBlock: null,
  };
  const entry = { ...base, judge };
  const problems = validateEntry(entry);
  if (problems.length) throw new Error(`refusing to write judge deployment: ${problems.join("; ")}`);
  data.networks[network] = entry;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  console.log(`wrote ${network}.judge -> ${file}`);
}
