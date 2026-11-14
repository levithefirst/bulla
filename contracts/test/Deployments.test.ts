import { expect } from "chai";
import { ethers } from "hardhat";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { readDeployments, writeDeployment, writeJudgeDeployment } from "../scripts/deployments";
import { resolveDeployment } from "../../shared/deployments";

// The deploy scripts and the web app share one schema (shared/deployments.ts). This checks that
// what deploy:testnet / deploy:mainnet write is exactly what web/src/config.ts will read.
describe("deployments.json wiring", () => {
  const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bulla-dep-")), "deployments.json");

  async function deployed() {
    const [owner, fr] = await ethers.getSigners();
    const T = await ethers.getContractFactory("MockERC20");
    const t = await T.deploy("USD Coin", "USDC", 6);
    const E = await ethers.getContractFactory("BullaEscrow");
    const e = await E.deploy(await t.getAddress(), fr.address, 50, owner.address);
    const rc = await e.deploymentTransaction()!.wait();
    return { escrow: await e.getAddress(), token: await t.getAddress(), fr: fr.address, block: rc!.blockNumber };
  }

  for (const [network, chainId] of [["xlayerTestnet", 1952], ["xlayerMainnet", 196]] as const) {
    it(`${network}: an entry written by the deploy script is picked up by the web config`, async () => {
      const d = await deployed();
      const file = tmp();
      fs.writeFileSync(file, JSON.stringify({ networks: { localhost: { network: "localhost", chainId: 31337, escrow: null, token: null, tokenSymbol: null, tokenDecimals: null, feeRecipient: null, feeBps: 50, deployedAt: null, deployBlock: null } } }));
      writeDeployment({ network, chainId, escrow: d.escrow, token: d.token, tokenSymbol: "USDC", tokenDecimals: 6, feeRecipient: d.fr, feeBps: 50, deployedAt: new Date().toISOString(), deployBlock: d.block }, file);
      const r = resolveDeployment(readDeployments(file), network);
      expect(r.escrow).to.equal(d.escrow);
      expect(r.token).to.equal(d.token);
      expect(r.tokenSymbol).to.equal("USDC");
      expect(r.feeBps).to.equal(50);
      expect(r.deployBlock).to.equal(BigInt(d.block));
      expect(readDeployments(file).networks.localhost, "other networks are preserved").to.not.equal(undefined);
      // VITE_* overrides still win
      expect(resolveDeployment(readDeployments(file), network, { escrow: d.token }).escrow).to.equal(d.token);
    });
  }

  it("refuses malformed entries (wrong chain id, bad address, missing deploy block)", async () => {
    const file = tmp();
    const base = { network: "xlayerMainnet" as const, chainId: 196, escrow: "0x0000000000000000000000000000000000000001", token: null, tokenSymbol: null, tokenDecimals: null, feeRecipient: null, feeBps: 50, deployedAt: null, deployBlock: 5 };
    expect(() => writeDeployment({ ...base, chainId: 1 }, file)).to.throw(/chainId/);
    expect(() => writeDeployment({ ...base, escrow: "0x1234" }, file)).to.throw(/escrow/);
    expect(() => writeDeployment({ ...base, deployBlock: null }, file)).to.throw(/deployBlock/);
    expect(() => writeDeployment({ ...base, feeBps: 5000 }, file)).to.throw(/feeBps/);
    expect(fs.existsSync(file)).to.equal(false);
  });

  it("the committed deployments.json is valid for every network", () => {
    const committed = readDeployments(path.resolve(__dirname, "../deployments.json"));
    for (const [k, e] of Object.entries(committed.networks)) {
      expect(e!.network, k).to.equal(k);
      expect(resolveDeployment(committed, e!.network).feeBps).to.equal(e!.feeBps);
    }
  });

  it("judge mode: testnet judge block round-trips and keeps the real-token entry; mainnet judge is refused", async () => {
    const d = await deployed();
    const file = tmp();
    writeDeployment({ network: "xlayerTestnet", chainId: 1952, escrow: d.escrow, token: d.token, tokenSymbol: "USDC", tokenDecimals: 6, feeRecipient: d.fr, feeBps: 50, deployedAt: null, deployBlock: d.block }, file);
    const judge = { escrow: d.token, token: d.escrow, deployBlock: d.block + 1, feeRecipient: d.fr, feeBps: 50, deployedAt: new Date().toISOString() };
    writeJudgeDeployment("xlayerTestnet", judge, file);
    const r = resolveDeployment(readDeployments(file), "xlayerTestnet");
    expect(r.escrow, "real-token escrow untouched").to.equal(d.escrow);
    expect(r.judge?.escrow).to.equal(d.token);
    expect(r.judge?.deployBlock).to.equal(BigInt(d.block + 1));
    expect(() => writeJudgeDeployment("xlayerMainnet", judge, file)).to.throw(/not allowed on xlayerMainnet/);
    expect(resolveDeployment(readDeployments(file), "xlayerMainnet", { judgeEscrow: d.escrow, judgeToken: d.token }).judge, "mainnet never resolves a judge escrow").to.equal(null);
  });
});
