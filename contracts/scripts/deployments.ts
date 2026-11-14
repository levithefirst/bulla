import * as fs from "fs";
import * as path from "path";

export const DEPLOYMENTS_PATH = path.resolve(__dirname, "../deployments.json");

export type DeploymentEntry = {
  network: string;
  chainId: number;
  escrow: string | null;
  token: string | null;
  tokenSymbol: string | null;
  tokenDecimals: number | null;
  feeRecipient: string | null;
  feeBps: number;
  deployedAt: string | null;
  deployBlock: number | null;
  note?: string;
};

export type DeploymentsFile = { networks: Record<string, DeploymentEntry> };

export function readDeployments(): DeploymentsFile {
  if (!fs.existsSync(DEPLOYMENTS_PATH)) return { networks: {} };
  return JSON.parse(fs.readFileSync(DEPLOYMENTS_PATH, "utf8"));
}

export function writeDeployment(entry: DeploymentEntry) {
  const file = readDeployments();
  file.networks[entry.network] = entry;
  fs.writeFileSync(DEPLOYMENTS_PATH, JSON.stringify(file, null, 2) + "\n");
  console.log(`wrote ${entry.network} -> ${DEPLOYMENTS_PATH}`);
}
