import * as fs from "fs";
import * as path from "path";
import { validateEntry, type DeploymentEntry, type DeploymentsFile } from "../../shared/deployments";

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
