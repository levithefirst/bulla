import { expect } from "chai";
import { ethers } from "hardhat";

describe("DemoUSD (judge-mode testnet token)", () => {
  it("6 decimals, mints to caller, caps per call and per address", async () => {
    const [a, b] = await ethers.getSigners();
    const D = await ethers.getContractFactory("DemoUSD");
    const d = await D.deploy();
    expect(await d.decimals()).to.equal(6);
    expect(await d.symbol()).to.equal("DemoUSD");
    await d.connect(a).mint(1_000_000_000n);
    expect(await d.balanceOf(a.address)).to.equal(1_000_000_000n);
    await expect(d.connect(a).mint(1_000_000_001n)).to.be.revertedWithCustomError(d, "MintAboveCallCap");
    for (let i = 0; i < 9; i++) await d.connect(a).mint(1_000_000_000n);
    await expect(d.connect(a).mint(1n)).to.be.revertedWithCustomError(d, "MintAboveAddressCap");
    await d.connect(b).mint(5n); // caps are per address
    expect(await d.minted(b.address)).to.equal(5n);
  });

  it("works as a BullaEscrow token with a stand-in TapeOut circuit (judge-mode setup)", async () => {
    const [owner, seller, buyer, fr] = await ethers.getSigners();
    const d = await (await ethers.getContractFactory("DemoUSD")).deploy();
    const proc = await (await ethers.getContractFactory("MockProcessor")).deploy();
    const opener = await (await ethers.getContractFactory("MockOpener")).deploy();
    const factory = await (await ethers.getContractFactory("MockTapeOutFactory")).deploy();
    await factory.addCpu(await proc.getAddress());
    const e = await (await ethers.getContractFactory("BullaEscrow")).deploy(await d.getAddress(), await opener.getAddress(), await factory.getAddress(), fr.address, 50, owner.address);
    await proc.connect(seller).mint();
    await opener.open(await proc.getAddress(), 1); // payouts reach a container only once it is opened
    await d.connect(buyer).mint(100_000_000n);
    const due = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    await e.connect(seller).createInvoice({
      buyer: buyer.address,
      token: await d.getAddress(),
      amounts: [100_000_000n],
      labels: ["demo"],
      dueTimestamp: due,
      processor: await proc.getAddress(),
      circuitId: 1,
      payToContainer: true,
      arbiter: ethers.ZeroAddress,
      termsHash: ethers.ZeroHash,
      memo: "demo",
    });
    await d.connect(buyer).approve(await e.getAddress(), 100_000_000n);
    await e.connect(buyer).fundInvoice(1, ethers.ZeroAddress);
    await e.connect(seller).submitMilestone(1, 0, ethers.keccak256("0x01"), "");
    await e.connect(buyer).releaseMilestone(1, 0);
    const container = await opener.accountOf(await proc.getAddress(), 1);
    expect(await d.balanceOf(container)).to.equal(99_500_000n);
  });
});
