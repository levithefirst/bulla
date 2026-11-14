import { expect } from "chai";
import { ethers, network } from "hardhat";
import { resolveTapeName, XLAYER_TAPEOUT } from "../../shared/tapeoutCore";

// Exercises the receipt's TapeOut-name resolver against mocks installed at the exact X Layer
// addresses from docs/research.md, so the production constants are what is tested.
describe("TapeOut name resolver (shared/tapeoutCore.ts)", () => {
  async function install(name: string, at: string) {
    const f = await ethers.getContractFactory(name);
    const tmp = await f.deploy();
    const code = await ethers.provider.getCode(await tmp.getAddress());
    await network.provider.send("hardhat_setCode", [at, code]);
    return ethers.getContractAt(name, at);
  }

  async function setup() {
    const factory = await install("MockTapeFactory", XLAYER_TAPEOUT.factory);
    const opener = await install("MockTapeOpener", XLAYER_TAPEOUT.opener);
    const C = await ethers.getContractFactory("MockTapeContainer");
    const container = await C.deploy();
    const containerAddr = await container.getAddress();
    const procs = Array.from({ length: 5 }, (_, i) => ethers.getAddress(`0x00000000000000000000000000000000000c${String(i).padStart(4, "0")}`));
    for (const p of procs) await factory.addCpu(p, true);
    const processor = procs[3];
    await container.setToken(196, processor, 7);
    await opener.setAccount(processor, 7, containerAddr);
    return { factory, opener, container, containerAddr, processor, procs };
  }

  const rpc = { request: (a: { method: string; params?: unknown }) => network.provider.request(a as never) };

  it("resolves <#ID>.2.<cpu>.tape when every check agrees", async () => {
    const { containerAddr, processor } = await setup();
    const r = await resolveTapeName(rpc, containerAddr as `0x${string}`);
    expect(r).to.not.equal(null);
    expect(r!.name).to.equal("7.2.3.tape");
    expect(r!.processorNumber).to.equal(3);
    expect(r!.processor).to.equal(processor);
    expect(r!.circuitId).to.equal(7n);
  });

  it("returns null (field hidden) when opener.accountOf does not match the container", async () => {
    const { opener, containerAddr, processor } = await setup();
    await opener.setAccount(processor, 7, ethers.Wallet.createRandom().address);
    expect(await resolveTapeName(rpc, containerAddr as `0x${string}`)).to.equal(null);
  });

  it("returns null when the processor is not a factory CPU", async () => {
    const { container, opener, containerAddr } = await setup();
    const fake = ethers.Wallet.createRandom().address;
    await container.setToken(196, fake, 7);
    await opener.setAccount(fake, 7, containerAddr);
    expect(await resolveTapeName(rpc, containerAddr as `0x${string}`)).to.equal(null);
  });

  it("returns null when the container is bound to another chain", async () => {
    const { container, containerAddr, processor } = await setup();
    await container.setToken(56, processor, 7);
    expect(await resolveTapeName(rpc, containerAddr as `0x${string}`)).to.equal(null);
  });

  it("returns null for an address that is not a container (e.g. the local fixture id)", async () => {
    await setup();
    expect(await resolveTapeName(rpc, "0x00000000000000000000000000000000b0110a00")).to.equal(null);
  });
});
