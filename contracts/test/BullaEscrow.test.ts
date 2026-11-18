import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import type { BullaEscrow } from "../typechain-types";

// Enum mirrors
const S = { None: 0, Draft: 1, Funded: 2, Completed: 3, Refunded: 4, Cancelled: 5 } as const;
const M = { Pending: 0, Submitted: 1, Released: 2, Refunded: 3 } as const;

const D = (n: number) => BigInt(n) * 1_000_000n; // 6-decimal token units
const H = (s: string) => ethers.keccak256(ethers.toUtf8Bytes(s));
const FEE_BPS = 50;
const fee = (a: bigint) => (a * BigInt(FEE_BPS)) / 10_000n;

async function deployFixture() {
  const [owner, seller, buyer, stranger, feeRecipient, arbiter, newHolder] = await ethers.getSigners();
  const token = await (await ethers.getContractFactory("MockERC20")).deploy("Mock USDC", "mUSDC", 6);
  const otherToken = await (await ethers.getContractFactory("MockERC20")).deploy("Other", "OTH", 18);
  const processor = await (await ethers.getContractFactory("MockProcessor")).deploy();
  const opener = await (await ethers.getContractFactory("MockOpener")).deploy();
  const factory = await (await ethers.getContractFactory("MockTapeOutFactory")).deploy();
  await factory.addCpu(await processor.getAddress());
  const escrow = await (await ethers.getContractFactory("BullaEscrow")).deploy(
    await token.getAddress(),
    await opener.getAddress(),
    await factory.getAddress(),
    feeRecipient.address,
    FEE_BPS,
    owner.address,
  );
  await processor.connect(seller).mint(); // seller holds circuit #1
  await token.mint(buyer.address, D(1_000_000));
  await otherToken.mint(buyer.address, D(1_000_000));
  await token.connect(buyer).approve(await escrow.getAddress(), ethers.MaxUint256);
  const container = await opener.accountOf(await processor.getAddress(), 1);
  return { owner, seller, buyer, stranger, feeRecipient, arbiter, newHolder, token, otherToken, processor, opener, factory, escrow, container };
}
type F = Awaited<ReturnType<typeof deployFixture>>;

async function params(f: F, o: Partial<BullaEscrow.CreateParamsStruct> = {}): Promise<BullaEscrow.CreateParamsStruct> {
  return {
    buyer: f.buyer.address,
    token: await f.token.getAddress(),
    amounts: [D(100), D(300)],
    labels: ["Wireframes", "Final design"],
    dueTimestamp: (await time.latest()) + 7 * 86_400,
    processor: await f.processor.getAddress(),
    circuitId: 1,
    payToContainer: false,
    arbiter: ethers.ZeroAddress,
    termsHash: ethers.ZeroHash,
    memo: "Logo, two milestones",
    ...o,
  };
}

async function create(f: F, o: Partial<BullaEscrow.CreateParamsStruct> = {}) {
  const p = await params(f, o);
  await f.escrow.connect(f.seller).createInvoice(p);
  return { id: await f.escrow.invoiceCount(), due: Number(p.dueTimestamp), p };
}

async function createFunded(f: F, o: Partial<BullaEscrow.CreateParamsStruct> = {}) {
  const r = await create(f, o);
  await f.escrow.connect(f.buyer).fundInvoice(r.id, (o.arbiter as string) ?? ethers.ZeroAddress);
  return r;
}

describe("BullaEscrow v2", () => {
  describe("constructor", () => {
    it("stores token, opener, factory, fee and owner and emits EscrowConfigured", async () => {
      const f = await loadFixture(deployFixture);
      expect(await f.escrow.token()).to.equal(await f.token.getAddress());
      expect(await f.escrow.opener()).to.equal(await f.opener.getAddress());
      expect(await f.escrow.factory()).to.equal(await f.factory.getAddress());
      expect(await f.escrow.feeBps()).to.equal(FEE_BPS);
      expect(await f.escrow.feeRecipient()).to.equal(f.feeRecipient.address);
      expect(await f.escrow.owner()).to.equal(f.owner.address);
      const E = await ethers.getContractFactory("BullaEscrow");
      const e = await E.deploy(await f.token.getAddress(), await f.opener.getAddress(), await f.factory.getAddress(), f.feeRecipient.address, 7, f.owner.address);
      await expect(e.deploymentTransaction()).to.emit(e, "EscrowConfigured");
    });

    it("rejects zero addresses and fees above the cap", async () => {
      const f = await loadFixture(deployFixture);
      const E = await ethers.getContractFactory("BullaEscrow");
      const [t, o, fa, r] = [await f.token.getAddress(), await f.opener.getAddress(), await f.factory.getAddress(), f.feeRecipient.address];
      const Z = ethers.ZeroAddress;
      for (const args of [[Z, o, fa, r], [t, Z, fa, r], [t, o, Z, r], [t, o, fa, Z]] as const) {
        await expect(E.deploy(args[0], args[1], args[2], args[3], 50, f.owner.address)).to.be.revertedWithCustomError(E, "ZeroAddress");
      }
      await expect(E.deploy(t, o, fa, r, 1001, f.owner.address)).to.be.revertedWithCustomError(E, "FeeTooHigh");
    });
  });

  describe("circuit binding", () => {
    it("stores processor, circuit id and container = opener.accountOf, and emits CircuitBound", async () => {
      const f = await loadFixture(deployFixture);
      const p = await params(f, { payToContainer: true });
      await expect(f.escrow.connect(f.seller).createInvoice(p))
        .to.emit(f.escrow, "CircuitBound")
        .withArgs(1n, await f.processor.getAddress(), 1n, f.container, true);
      const inv = await f.escrow.getInvoice(1);
      expect(inv.processor).to.equal(await f.processor.getAddress());
      expect(inv.circuitId).to.equal(1n);
      expect(inv.container).to.equal(f.container);
      expect(inv.payToContainer).to.equal(true);
    });

    it("requires the caller to hold the circuit", async () => {
      const f = await loadFixture(deployFixture);
      await f.processor.connect(f.stranger).mint(); // #2 held by stranger
      await expect(f.escrow.connect(f.seller).createInvoice(await params(f, { circuitId: 2 })))
        .to.be.revertedWithCustomError(f.escrow, "NotCircuitHolder")
        .withArgs(await f.processor.getAddress(), 2n, f.stranger.address);
    });

    it("reverts for a circuit that does not exist", async () => {
      const f = await loadFixture(deployFixture);
      await expect(f.escrow.connect(f.seller).createInvoice(await params(f, { circuitId: 99 }))).to.be.revertedWithCustomError(f.processor, "NoSuchToken");
    });

    it("rejects a processor that is not a TapeOut processor (factory.isCPU)", async () => {
      const f = await loadFixture(deployFixture);
      const rogue = await (await ethers.getContractFactory("MockProcessor")).deploy();
      await rogue.connect(f.seller).mint();
      await expect(f.escrow.connect(f.seller).createInvoice(await params(f, { processor: await rogue.getAddress() })))
        .to.be.revertedWithCustomError(f.escrow, "NotTapeOutProcessor")
        .withArgs(await rogue.getAddress());
    });
  });

  describe("create validation", () => {
    it("validates buyer, token, due date, arbiter", async () => {
      const f = await loadFixture(deployFixture);
      const c = f.escrow.connect(f.seller);
      await expect(c.createInvoice(await params(f, { buyer: ethers.ZeroAddress }))).to.be.revertedWithCustomError(f.escrow, "InvalidBuyer");
      await expect(c.createInvoice(await params(f, { buyer: f.seller.address }))).to.be.revertedWithCustomError(f.escrow, "InvalidBuyer");
      await expect(c.createInvoice(await params(f, { token: await f.otherToken.getAddress() }))).to.be.revertedWithCustomError(f.escrow, "UnsupportedToken");
      await expect(c.createInvoice(await params(f, { dueTimestamp: (await time.latest()) - 1 }))).to.be.revertedWithCustomError(f.escrow, "DueInPast");
      await expect(c.createInvoice(await params(f, { arbiter: f.buyer.address }))).to.be.revertedWithCustomError(f.escrow, "InvalidArbiter");
      await expect(c.createInvoice(await params(f, { arbiter: f.seller.address }))).to.be.revertedWithCustomError(f.escrow, "InvalidArbiter");
    });

    it("validates milestones: 1 to 10, labels match, amounts > 0, labels <= 80 bytes", async () => {
      const f = await loadFixture(deployFixture);
      const c = f.escrow.connect(f.seller);
      await expect(c.createInvoice(await params(f, { amounts: [], labels: [] }))).to.be.revertedWithCustomError(f.escrow, "InvalidMilestones");
      const eleven = Array.from({ length: 11 }, () => D(1));
      await expect(c.createInvoice(await params(f, { amounts: eleven, labels: eleven.map(() => "x") }))).to.be.revertedWithCustomError(f.escrow, "InvalidMilestones");
      await expect(c.createInvoice(await params(f, { amounts: [D(1), D(2)], labels: ["a"] }))).to.be.revertedWithCustomError(f.escrow, "InvalidMilestones");
      await expect(c.createInvoice(await params(f, { amounts: [D(1), 0n], labels: ["a", "b"] }))).to.be.revertedWithCustomError(f.escrow, "InvalidAmount");
      await expect(c.createInvoice(await params(f, { amounts: [D(1)], labels: ["x".repeat(81)] })))
        .to.be.revertedWithCustomError(f.escrow, "LabelTooLong")
        .withArgs(0n);
      const ten = Array.from({ length: 10 }, (_, i) => D(i + 1));
      await c.createInvoice(await params(f, { amounts: ten, labels: ten.map((_, i) => `M${i + 1}`) }));
      const inv = await f.escrow.getInvoice(1);
      expect(inv.milestoneCount).to.equal(10);
      expect(inv.totalAmount).to.equal(D(55));
      const ms = await f.escrow.getMilestones(1);
      expect(ms.map((m) => m.label)).to.deep.equal(ten.map((_, i) => `M${i + 1}`));
    });
  });

  describe("milestone happy path", () => {
    it("Draft -> Funded -> submit and release each milestone -> Completed, fee per release", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await create(f);
      const ea = await f.escrow.getAddress();
      expect((await f.escrow.getInvoice(id)).state).to.equal(S.Draft);

      await expect(f.escrow.connect(f.buyer).fundInvoice(id, ethers.ZeroAddress)).to.emit(f.escrow, "InvoiceFunded").withArgs(id, f.buyer.address, D(400), ethers.ZeroAddress);
      expect(await f.token.balanceOf(ea)).to.equal(D(400));
      expect(await f.escrow.totalHeld()).to.equal(D(400));

      await expect(f.escrow.connect(f.seller).submitMilestone(id, 0, H("wires"), "ipfs://w")).to.emit(f.escrow, "MilestoneSubmitted").withArgs(id, 0n, H("wires"), "ipfs://w");
      await expect(f.escrow.connect(f.buyer).releaseMilestone(id, 0))
        .to.emit(f.escrow, "MilestoneReleased")
        .withArgs(id, 0n, f.seller.address, D(100) - fee(D(100)), fee(D(100)), f.buyer.address)
        .and.to.emit(f.escrow, "FeePaid")
        .withArgs(id, 0n, f.feeRecipient.address, fee(D(100)));
      expect((await f.escrow.getInvoice(id)).state).to.equal(S.Funded);
      expect(await f.escrow.totalHeld()).to.equal(D(300));

      await f.escrow.connect(f.seller).submitMilestone(id, 1, H("final"), "");
      await expect(f.escrow.connect(f.buyer).releaseMilestone(id, 1)).to.emit(f.escrow, "InvoiceCompleted").withArgs(id, D(400), 0n);

      const inv = await f.escrow.getInvoice(id);
      expect(inv.state).to.equal(S.Completed);
      expect(inv.releasedAmount).to.equal(D(400));
      const ms = await f.escrow.getMilestones(id);
      expect(ms.map((m) => Number(m.state))).to.deep.equal([M.Released, M.Released]);
      expect(ms[0].paidTo).to.equal(f.seller.address);
      expect(await f.token.balanceOf(f.seller.address)).to.equal(D(400) - fee(D(100)) - fee(D(300)));
      expect(await f.token.balanceOf(f.feeRecipient.address)).to.equal(fee(D(100)) + fee(D(300)));
      expect(await f.token.balanceOf(ea)).to.equal(0n);
      expect(await f.escrow.totalHeld()).to.equal(0n);
    });

    it("buyer may release a Pending milestone early; seller may resubmit", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createFunded(f);
      await f.escrow.connect(f.seller).submitMilestone(id, 1, H("v1"), "");
      await f.escrow.connect(f.seller).submitMilestone(id, 1, H("v2"), "");
      expect((await f.escrow.getMilestones(id))[1].deliveryHash).to.equal(H("v2"));
      await f.escrow.connect(f.buyer).releaseMilestone(id, 0); // never submitted
      expect(Number((await f.escrow.getMilestones(id))[0].state)).to.equal(M.Released);
    });

    it("rejects double release, unknown milestones and zero delivery hashes", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createFunded(f);
      await f.escrow.connect(f.buyer).releaseMilestone(id, 0);
      await expect(f.escrow.connect(f.buyer).releaseMilestone(id, 0)).to.be.revertedWithCustomError(f.escrow, "WrongMilestoneState").withArgs(M.Released);
      await expect(f.escrow.connect(f.buyer).releaseMilestone(id, 5)).to.be.revertedWithCustomError(f.escrow, "MilestoneNotFound").withArgs(id, 5n);
      await expect(f.escrow.connect(f.seller).submitMilestone(id, 0, H("late"), "")).to.be.revertedWithCustomError(f.escrow, "WrongMilestoneState");
      await expect(f.escrow.connect(f.seller).submitMilestone(id, 1, ethers.ZeroHash, "")).to.be.revertedWithCustomError(f.escrow, "MissingDeliveryHash");
    });

    it("cannot submit or release before funding, nor fund twice", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await create(f);
      await expect(f.escrow.connect(f.seller).submitMilestone(id, 0, H("x"), "")).to.be.revertedWithCustomError(f.escrow, "WrongState").withArgs(S.Draft);
      await expect(f.escrow.connect(f.buyer).releaseMilestone(id, 0)).to.be.revertedWithCustomError(f.escrow, "WrongState").withArgs(S.Draft);
      await f.escrow.connect(f.buyer).fundInvoice(id, ethers.ZeroAddress);
      await expect(f.escrow.connect(f.buyer).fundInvoice(id, ethers.ZeroAddress)).to.be.revertedWithCustomError(f.escrow, "WrongState").withArgs(S.Funded);
    });

    it("cannot fund or submit at or after the due date", async () => {
      const f = await loadFixture(deployFixture);
      const a = await create(f, { dueTimestamp: (await time.latest()) + 3600 });
      await time.increaseTo(a.due);
      await expect(f.escrow.connect(f.buyer).fundInvoice(a.id, ethers.ZeroAddress)).to.be.revertedWithCustomError(f.escrow, "PastDue");
      const b = await createFunded(f, { dueTimestamp: (await time.latest()) + 3600 });
      await time.increaseTo(b.due);
      await expect(f.escrow.connect(f.seller).submitMilestone(b.id, 0, H("x"), "")).to.be.revertedWithCustomError(f.escrow, "PastDue");
    });
  });

  describe("payout target", () => {
    it("payToContainer pays the circuit's container once it is opened", async () => {
      const f = await loadFixture(deployFixture);
      await f.opener.open(await f.processor.getAddress(), 1);
      const { id } = await createFunded(f, { payToContainer: true });
      expect(await f.escrow.containerOpened(id)).to.equal(true);
      expect(await f.escrow.payoutTarget(id)).to.equal(f.container);
      await expect(f.escrow.connect(f.buyer).releaseMilestone(id, 0)).to.emit(f.escrow, "MilestoneReleased").withArgs(id, 0n, f.container, D(100) - fee(D(100)), fee(D(100)), f.buyer.address);
      expect(await f.token.balanceOf(f.container)).to.equal(D(100) - fee(D(100)));
      expect((await f.escrow.getMilestones(id))[0].paidTo).to.equal(f.container);
    });

    it("if the circuit moves, the next release pays the new holder (receivables follow the circuit)", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createFunded(f);
      await f.escrow.connect(f.buyer).releaseMilestone(id, 0);
      await f.processor.connect(f.seller).transferFrom(f.seller.address, f.newHolder.address, 1);
      expect(await f.escrow.payoutTarget(id)).to.equal(f.newHolder.address);
      await f.escrow.connect(f.buyer).releaseMilestone(id, 1);
      const ms = await f.escrow.getMilestones(id);
      expect(ms[0].paidTo).to.equal(f.seller.address);
      expect(ms[1].paidTo).to.equal(f.newHolder.address);
      expect(await f.token.balanceOf(f.newHolder.address)).to.equal(D(300) - fee(D(300)));
    });

    it("payToContainer falls back to the circuit holder while the container is not opened", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createFunded(f, { payToContainer: true });
      expect(await f.escrow.containerOpened(id)).to.equal(false);
      expect(await f.escrow.payoutTarget(id)).to.equal(f.seller.address);
      await f.escrow.connect(f.buyer).releaseMilestone(id, 0);
      expect((await f.escrow.getMilestones(id))[0].paidTo).to.equal(f.seller.address);
      await f.opener.open(await f.processor.getAddress(), 1);
      await f.escrow.connect(f.buyer).releaseMilestone(id, 1);
      expect((await f.escrow.getMilestones(id))[1].paidTo).to.equal(f.container);
      expect(await f.token.balanceOf(f.container)).to.equal(D(300) - fee(D(300)));
    });

    it("with payToContainer the container stays the target after a circuit transfer", async () => {
      const f = await loadFixture(deployFixture);
      await f.opener.open(await f.processor.getAddress(), 1);
      const { id } = await createFunded(f, { payToContainer: true });
      await f.processor.connect(f.seller).transferFrom(f.seller.address, f.newHolder.address, 1);
      expect(await f.escrow.payoutTarget(id)).to.equal(f.container);
    });

    it("if ownerOf reverts (burned circuit), releases fall back to the original seller", async () => {
      const f = await loadFixture(deployFixture);
      const tp = await (await ethers.getContractFactory("TogglingProcessor")).deploy();
      await tp.set(7, f.seller.address);
      await f.factory.addCpu(await tp.getAddress());
      const { id } = await createFunded(f, { processor: await tp.getAddress(), circuitId: 7 });
      await tp.breakIt(true);
      expect(await f.escrow.payoutTarget(id)).to.equal(f.seller.address);
      await f.escrow.connect(f.buyer).releaseMilestone(id, 0);
      expect((await f.escrow.getMilestones(id))[0].paidTo).to.equal(f.seller.address);
    });
  });

  describe("circuit stats (on-chain payment history)", () => {
    it("counts funded invoices (not drafts), released and refunded milestones and released volume per circuit", async () => {
      const f = await loadFixture(deployFixture);
      const pa = await f.processor.getAddress();
      const a = await createFunded(f, { arbiter: f.arbiter.address, dueTimestamp: (await time.latest()) + 3600 });
      await f.escrow.connect(f.buyer).releaseMilestone(a.id, 0);
      await create(f);
      let st = await f.escrow.circuitStats(pa, 1);
      expect(st.fundedInvoices).to.equal(1n); // the second invoice is an unfunded draft: not counted
      expect(st.releasedMilestones).to.equal(1n);
      expect(st.releasedAmount).to.equal(D(100));
      await time.increaseTo(a.due);
      await f.escrow.connect(f.buyer).claimRefund(a.id);
      st = await f.escrow.circuitStats(pa, 1);
      expect(st.refundedMilestones).to.equal(1n);
      const other = await f.escrow.circuitStats(pa, 2);
      expect(other.fundedInvoices).to.equal(0n);
    });
  });

  describe("arbiter", () => {
    it("buyer must accept the proposed arbiter when funding", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await create(f, { arbiter: f.arbiter.address });
      await expect(f.escrow.connect(f.buyer).fundInvoice(id, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(f.escrow, "ArbiterMismatch")
        .withArgs(f.arbiter.address, ethers.ZeroAddress);
      await expect(f.escrow.connect(f.buyer).fundInvoice(id, f.arbiter.address)).to.emit(f.escrow, "InvoiceFunded").withArgs(id, f.buyer.address, D(400), f.arbiter.address);
    });

    it("arbiter releases a submitted milestone (fee applies, arbiter gets nothing) or refunds one", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createFunded(f, { arbiter: f.arbiter.address });
      await expect(f.escrow.connect(f.arbiter).arbiterRelease(id, 0)).to.be.revertedWithCustomError(f.escrow, "WrongMilestoneState").withArgs(M.Pending);
      await f.escrow.connect(f.seller).submitMilestone(id, 0, H("a"), "");
      await f.escrow.connect(f.seller).submitMilestone(id, 1, H("b"), "");
      const buyerBefore = await f.token.balanceOf(f.buyer.address);
      await expect(f.escrow.connect(f.arbiter).arbiterRelease(id, 0)).to.emit(f.escrow, "MilestoneReleased").withArgs(id, 0n, f.seller.address, D(100) - fee(D(100)), fee(D(100)), f.arbiter.address);
      await expect(f.escrow.connect(f.arbiter).arbiterRefund(id, 1))
        .to.emit(f.escrow, "MilestoneRefunded")
        .withArgs(id, 1n, D(300), f.arbiter.address)
        .and.to.emit(f.escrow, "InvoiceCompleted")
        .withArgs(id, D(100), D(300));
      expect(await f.token.balanceOf(f.arbiter.address)).to.equal(0n);
      expect((await f.token.balanceOf(f.buyer.address)) - buyerBefore).to.equal(D(300));
      expect((await f.escrow.getInvoice(id)).state).to.equal(S.Completed);
      expect(await f.escrow.totalHeld()).to.equal(0n);
    });

    it("only the arbiter can arbitrate, and only when one was set", async () => {
      const f = await loadFixture(deployFixture);
      const a = await createFunded(f, { arbiter: f.arbiter.address });
      await f.escrow.connect(f.seller).submitMilestone(a.id, 0, H("a"), "");
      for (const s of [f.buyer, f.seller, f.stranger]) {
        await expect(f.escrow.connect(s).arbiterRelease(a.id, 0)).to.be.revertedWithCustomError(f.escrow, "NotArbiter");
        await expect(f.escrow.connect(s).arbiterRefund(a.id, 0)).to.be.revertedWithCustomError(f.escrow, "NotArbiter");
      }
      const b = await createFunded(f);
      await expect(f.escrow.connect(f.arbiter).arbiterRelease(b.id, 0)).to.be.revertedWithCustomError(f.escrow, "NotArbiter");
    });
  });

  describe("authorization", () => {
    it("only buyer funds/releases/refunds, only seller submits, only parties cancel", async () => {
      const f = await loadFixture(deployFixture);
      const { id, due } = await create(f, { dueTimestamp: (await time.latest()) + 3600 });
      await expect(f.escrow.connect(f.seller).fundInvoice(id, ethers.ZeroAddress)).to.be.revertedWithCustomError(f.escrow, "NotBuyer");
      await f.escrow.connect(f.buyer).fundInvoice(id, ethers.ZeroAddress);
      await expect(f.escrow.connect(f.buyer).submitMilestone(id, 0, H("x"), "")).to.be.revertedWithCustomError(f.escrow, "NotSeller");
      await expect(f.escrow.connect(f.seller).releaseMilestone(id, 0)).to.be.revertedWithCustomError(f.escrow, "NotBuyer");
      await expect(f.escrow.connect(f.stranger).releaseMilestone(id, 0)).to.be.revertedWithCustomError(f.escrow, "NotBuyer");
      await time.increaseTo(due);
      await expect(f.escrow.connect(f.seller).claimRefund(id)).to.be.revertedWithCustomError(f.escrow, "NotBuyer");
      await expect(f.escrow.connect(f.stranger).mutualCancel(id)).to.be.revertedWithCustomError(f.escrow, "NotParty");
    });

    it("only the owner changes the fee recipient; the owner cannot touch funds", async () => {
      const f = await loadFixture(deployFixture);
      await expect(f.escrow.connect(f.stranger).setFeeRecipient(f.stranger.address)).to.be.revertedWithCustomError(f.escrow, "OwnableUnauthorizedAccount");
      await expect(f.escrow.connect(f.owner).setFeeRecipient(ethers.ZeroAddress)).to.be.revertedWithCustomError(f.escrow, "ZeroAddress");
      await expect(f.escrow.connect(f.owner).setFeeRecipient(f.stranger.address)).to.emit(f.escrow, "FeeRecipientUpdated").withArgs(f.feeRecipient.address, f.stranger.address);
      const { id } = await createFunded(f);
      await expect(f.escrow.connect(f.owner).releaseMilestone(id, 0)).to.be.revertedWithCustomError(f.escrow, "NotBuyer");
      await expect(f.escrow.connect(f.owner).claimRefund(id)).to.be.revertedWithCustomError(f.escrow, "NotBuyer");
      await expect(f.escrow.connect(f.owner).mutualCancel(id)).to.be.revertedWithCustomError(f.escrow, "NotParty");
    });

    it("unknown invoice ids revert InvoiceNotFound", async () => {
      const f = await loadFixture(deployFixture);
      for (const id of [0n, 99n]) {
        await expect(f.escrow.getInvoice(id)).to.be.revertedWithCustomError(f.escrow, "InvoiceNotFound").withArgs(id);
        await expect(f.escrow.getMilestones(id)).to.be.revertedWithCustomError(f.escrow, "InvoiceNotFound");
        await expect(f.escrow.payoutTarget(id)).to.be.revertedWithCustomError(f.escrow, "InvoiceNotFound");
      }
    });
  });

  describe("time-lock refund", () => {
    it("too early reverts; after the due date it refunds only unreleased milestones", async () => {
      const f = await loadFixture(deployFixture);
      const { id, due } = await createFunded(f, { dueTimestamp: (await time.latest()) + 3600 });
      await f.escrow.connect(f.buyer).releaseMilestone(id, 0);
      await expect(f.escrow.connect(f.buyer).claimRefund(id)).to.be.revertedWithCustomError(f.escrow, "NotYetDue").withArgs(due);
      await time.increaseTo(due);
      const before = await f.token.balanceOf(f.buyer.address);
      await expect(f.escrow.connect(f.buyer).claimRefund(id)).to.emit(f.escrow, "Refunded").withArgs(id, f.buyer.address, D(300));
      expect((await f.token.balanceOf(f.buyer.address)) - before).to.equal(D(300));
      const inv = await f.escrow.getInvoice(id);
      expect(inv.state).to.equal(S.Refunded);
      expect(inv.releasedAmount).to.equal(D(100));
      expect(inv.refundedAmount).to.equal(D(300));
      expect((await f.escrow.getMilestones(id)).map((m) => Number(m.state))).to.deep.equal([M.Released, M.Refunded]);
      expect(await f.escrow.totalHeld()).to.equal(0n);
      await expect(f.escrow.connect(f.buyer).claimRefund(id)).to.be.revertedWithCustomError(f.escrow, "WrongState").withArgs(S.Refunded);
      await expect(f.escrow.connect(f.buyer).releaseMilestone(id, 1)).to.be.revertedWithCustomError(f.escrow, "WrongState");
    });

    it("refund covers submitted milestones too, and not a Draft", async () => {
      const f = await loadFixture(deployFixture);
      const a = await createFunded(f, { dueTimestamp: (await time.latest()) + 3600 });
      await f.escrow.connect(f.seller).submitMilestone(a.id, 0, H("x"), "");
      const b = await create(f, { dueTimestamp: (await time.latest()) + 3600 });
      await time.increaseTo(a.due + 10);
      await f.escrow.connect(f.buyer).claimRefund(a.id);
      expect((await f.escrow.getInvoice(a.id)).refundedAmount).to.equal(D(400));
      await expect(f.escrow.connect(f.buyer).claimRefund(b.id)).to.be.revertedWithCustomError(f.escrow, "WrongState").withArgs(S.Draft);
    });
  });

  describe("mutual cancel", () => {
    it("before funding: both consent -> Cancelled, nothing moves", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await create(f);
      await expect(f.escrow.connect(f.seller).mutualCancel(id)).to.emit(f.escrow, "CancelConsentGiven").withArgs(id, f.seller.address);
      await expect(f.escrow.connect(f.seller).mutualCancel(id)).to.be.revertedWithCustomError(f.escrow, "AlreadyConsented");
      await expect(f.escrow.connect(f.buyer).mutualCancel(id)).to.emit(f.escrow, "InvoiceCancelled").withArgs(id, 0n);
      expect((await f.escrow.getInvoice(id)).state).to.equal(S.Cancelled);
      await expect(f.escrow.connect(f.buyer).fundInvoice(id, ethers.ZeroAddress)).to.be.revertedWithCustomError(f.escrow, "WrongState").withArgs(S.Cancelled);
    });

    it("after a partial release: refunds only the unreleased remainder, no fee", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createFunded(f);
      await f.escrow.connect(f.buyer).releaseMilestone(id, 0);
      const before = await f.token.balanceOf(f.buyer.address);
      const feeBefore = await f.token.balanceOf(f.feeRecipient.address);
      await f.escrow.connect(f.buyer).mutualCancel(id);
      await expect(f.escrow.connect(f.seller).mutualCancel(id)).to.emit(f.escrow, "InvoiceCancelled").withArgs(id, D(300));
      expect((await f.token.balanceOf(f.buyer.address)) - before).to.equal(D(300));
      expect(await f.token.balanceOf(f.feeRecipient.address)).to.equal(feeBefore);
      expect(await f.token.balanceOf(await f.escrow.getAddress())).to.equal(0n);
    });

    it("consent given on the draft is cleared at funding: the buyer cannot later cancel alone", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await create(f);
      await f.escrow.connect(f.seller).mutualCancel(id);
      expect((await f.escrow.getInvoice(id)).sellerCancelConsent).to.equal(true);
      await f.token.connect(f.buyer).approve(await f.escrow.getAddress(), D(1000));
      await expect(f.escrow.connect(f.buyer).fundInvoice(id, ethers.ZeroAddress)).to.emit(f.escrow, "CancelConsentRevoked").withArgs(id, f.seller.address);
      const inv = await f.escrow.getInvoice(id);
      expect([inv.sellerCancelConsent, inv.buyerCancelConsent]).to.deep.equal([false, false]);
      await f.escrow.connect(f.seller).submitMilestone(id, 0, ethers.id("delivered"), "");
      // The buyer's consent alone no longer cancels: the submitted milestone stays in escrow.
      await expect(f.escrow.connect(f.buyer).mutualCancel(id)).to.emit(f.escrow, "CancelConsentGiven").and.not.to.emit(f.escrow, "InvoiceCancelled");
      expect((await f.escrow.getInvoice(id)).state).to.equal(S.Funded);
      expect((await f.escrow.getMilestones(id))[0].state).to.equal(1n);
    });

    it("buyer consent on the draft is also cleared at funding", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await create(f);
      await f.escrow.connect(f.buyer).mutualCancel(id);
      await f.token.connect(f.buyer).approve(await f.escrow.getAddress(), D(1000));
      await expect(f.escrow.connect(f.buyer).fundInvoice(id, ethers.ZeroAddress)).to.emit(f.escrow, "CancelConsentRevoked").withArgs(id, f.buyer.address);
      await expect(f.escrow.connect(f.seller).mutualCancel(id)).not.to.emit(f.escrow, "InvoiceCancelled");
      expect((await f.escrow.getInvoice(id)).state).to.equal(S.Funded);
    });

    it("revokeCancelConsent: a party withdraws its consent, then the other side alone cannot cancel", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createFunded(f);
      await f.escrow.connect(f.seller).mutualCancel(id);
      await expect(f.escrow.connect(f.seller).revokeCancelConsent(id)).to.emit(f.escrow, "CancelConsentRevoked").withArgs(id, f.seller.address);
      expect((await f.escrow.getInvoice(id)).sellerCancelConsent).to.equal(false);
      await expect(f.escrow.connect(f.buyer).mutualCancel(id)).not.to.emit(f.escrow, "InvoiceCancelled");
      expect((await f.escrow.getInvoice(id)).state).to.equal(S.Funded);
      // Consent can be given again after revoking.
      await expect(f.escrow.connect(f.seller).mutualCancel(id)).to.emit(f.escrow, "InvoiceCancelled");
    });

    it("revokeCancelConsent reverts without consent, for strangers, and on closed invoices", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await create(f);
      await expect(f.escrow.connect(f.buyer).revokeCancelConsent(id)).to.be.revertedWithCustomError(f.escrow, "NoConsentToRevoke");
      await expect(f.escrow.connect(f.stranger).revokeCancelConsent(id)).to.be.revertedWithCustomError(f.escrow, "NotParty");
      await f.escrow.connect(f.buyer).mutualCancel(id);
      await expect(f.escrow.connect(f.buyer).revokeCancelConsent(id)).to.emit(f.escrow, "CancelConsentRevoked");
      await f.escrow.connect(f.buyer).mutualCancel(id);
      await f.escrow.connect(f.seller).mutualCancel(id);
      await expect(f.escrow.connect(f.buyer).revokeCancelConsent(id)).to.be.revertedWithCustomError(f.escrow, "WrongState").withArgs(S.Cancelled);
      await expect(f.escrow.revokeCancelConsent(999)).to.be.revertedWithCustomError(f.escrow, "InvoiceNotFound");
    });

    it("one-sided consent does not block releases; closed invoices cannot be cancelled", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createFunded(f, { amounts: [D(5)], labels: ["only"] });
      await f.escrow.connect(f.seller).mutualCancel(id);
      await f.escrow.connect(f.buyer).releaseMilestone(id, 0);
      expect((await f.escrow.getInvoice(id)).state).to.equal(S.Completed);
      await expect(f.escrow.connect(f.buyer).mutualCancel(id)).to.be.revertedWithCustomError(f.escrow, "WrongState").withArgs(S.Completed);
    });
  });

  describe("tokens", () => {
    it("approving a different token does not fund", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await create(f);
      await f.token.connect(f.buyer).approve(await f.escrow.getAddress(), 0);
      await f.otherToken.connect(f.buyer).approve(await f.escrow.getAddress(), ethers.MaxUint256);
      await expect(f.escrow.connect(f.buyer).fundInvoice(id, ethers.ZeroAddress)).to.be.revertedWithCustomError(f.token, "ERC20InsufficientAllowance");
    });

    it("fee-on-transfer token is rejected at funding with TransferShortfall", async () => {
      const f = await loadFixture(deployFixture);
      const fot = await (await ethers.getContractFactory("FeeOnTransferToken")).deploy();
      const e = await (await ethers.getContractFactory("BullaEscrow")).deploy(await fot.getAddress(), await f.opener.getAddress(), await f.factory.getAddress(), f.feeRecipient.address, FEE_BPS, f.owner.address);
      await fot.mint(f.buyer.address, D(1000));
      await e.connect(f.seller).createInvoice(await params(f, { token: await fot.getAddress(), amounts: [D(100)], labels: ["a"] }));
      await fot.connect(f.buyer).approve(await e.getAddress(), D(100));
      await expect(e.connect(f.buyer).fundInvoice(1, ethers.ZeroAddress)).to.be.revertedWithCustomError(e, "TransferShortfall").withArgs(D(100), D(99));
    });
  });

  describe("fee math", () => {
    it("quoteRelease rounds down and fee + net == amount", async () => {
      const f = await loadFixture(deployFixture);
      for (const a of [0n, 1n, 199n, 200n, 201n, 12_345_678n, D(1), 2n ** 255n, ethers.MaxUint256]) {
        const [fe, net] = await f.escrow.quoteRelease(a);
        expect(fe).to.equal((a * 50n) / 10_000n);
        expect(fe + net).to.equal(a);
      }
    });

    it("zero-fee escrow pays in full and emits no FeePaid; tiny milestones pay zero fee", async () => {
      const f = await loadFixture(deployFixture);
      const e = await (await ethers.getContractFactory("BullaEscrow")).deploy(await f.token.getAddress(), await f.opener.getAddress(), await f.factory.getAddress(), f.feeRecipient.address, 0, f.owner.address);
      await f.token.connect(f.buyer).approve(await e.getAddress(), ethers.MaxUint256);
      await e.connect(f.seller).createInvoice(await params(f, { amounts: [D(10), 150n], labels: ["a", "b"] }));
      await e.connect(f.buyer).fundInvoice(1, ethers.ZeroAddress);
      await expect(e.connect(f.buyer).releaseMilestone(1, 0)).to.not.emit(e, "FeePaid");
      await expect(e.connect(f.buyer).releaseMilestone(1, 1)).to.not.emit(e, "FeePaid");
      expect(await f.token.balanceOf(f.seller.address)).to.equal(D(10) + 150n);
    });
  });

  describe("reentrancy", () => {
    async function reentrantFixture() {
      const f = await deployFixture();
      const rt = await (await ethers.getContractFactory("ReentrantToken")).deploy();
      const e = await (await ethers.getContractFactory("BullaEscrow")).deploy(await rt.getAddress(), await f.opener.getAddress(), await f.factory.getAddress(), f.feeRecipient.address, FEE_BPS, f.owner.address);
      await rt.mint(f.buyer.address, D(10_000));
      await rt.connect(f.buyer).approve(await e.getAddress(), ethers.MaxUint256);
      const due = (await time.latest()) + 3600;
      for (let i = 0; i < 2; i++) {
        await e.connect(f.seller).createInvoice(await params(f, { token: await rt.getAddress(), dueTimestamp: due }));
        await e.connect(f.buyer).fundInvoice(i + 1, ethers.ZeroAddress);
      }
      return { ...f, e, rt, due };
    }

    it("re-entering releaseMilestone during a release reverts the whole tx", async () => {
      const r = await loadFixture(reentrantFixture);
      await r.rt.arm(await r.e.getAddress(), 1, 2);
      await expect(r.e.connect(r.buyer).releaseMilestone(1, 0)).to.be.revertedWithCustomError(r.e, "ReentrancyGuardReentrantCall");
      expect(Number((await r.e.getMilestones(1))[0].state)).to.equal(M.Pending);
      expect(await r.rt.balanceOf(await r.e.getAddress())).to.equal(D(800));
    });

    it("re-entering claimRefund during a refund reverts the whole tx", async () => {
      const r = await loadFixture(reentrantFixture);
      await time.increaseTo(r.due + 1);
      await r.rt.arm(await r.e.getAddress(), 2, 2);
      await expect(r.e.connect(r.buyer).claimRefund(1)).to.be.revertedWithCustomError(r.e, "ReentrancyGuardReentrantCall");
      expect((await r.e.getInvoice(1)).state).to.equal(S.Funded);
    });
  });
});
