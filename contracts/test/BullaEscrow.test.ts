import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

// State enum mirror
const S = { None: 0, Draft: 1, Funded: 2, Submitted: 3, Released: 4, Refunded: 5, Cancelled: 6 } as const;

// Local fixture container id (NOT a real TapeOut container). See docs/tapeout-binding.md.
const FIXTURE_CONTAINER_ID = ethers.zeroPadValue("0x00000000000000000000000000000000b0110a00", 32);
const DELIVERY_HASH = ethers.keccak256(ethers.toUtf8Bytes("logo-v1.zip"));
const AMOUNT = 1_000_000_000n; // 1,000 mUSDC (6 decimals)
const FEE_BPS = 50;

async function deployFixture() {
  const [owner, seller, buyer, stranger, feeRecipient, newFeeRecipient] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("MockERC20");
  const token = await Token.deploy("Mock USDC", "mUSDC", 6);
  const Other = await ethers.getContractFactory("MockERC20");
  const otherToken = await Other.deploy("Other", "OTH", 18);
  const Escrow = await ethers.getContractFactory("BullaEscrow");
  const escrow = await Escrow.deploy(await token.getAddress(), feeRecipient.address, FEE_BPS, owner.address);

  await token.mint(buyer.address, AMOUNT * 10n);
  await otherToken.mint(buyer.address, AMOUNT * 10n);
  return { owner, seller, buyer, stranger, feeRecipient, newFeeRecipient, token, otherToken, escrow };
}

async function createDefault(f: Awaited<ReturnType<typeof deployFixture>>, dueIn = 7 * 24 * 3600) {
  const due = (await time.latest()) + dueIn;
  await f.escrow
    .connect(f.seller)
    .createInvoice(f.buyer.address, await f.token.getAddress(), AMOUNT, due, ethers.ZeroHash, FIXTURE_CONTAINER_ID, "Logo design, milestone 1");
  return { id: await f.escrow.invoiceCount(), due };
}

async function fund(f: Awaited<ReturnType<typeof deployFixture>>, id: bigint) {
  await f.token.connect(f.buyer).approve(await f.escrow.getAddress(), AMOUNT);
  await f.escrow.connect(f.buyer).fundInvoice(id);
}

describe("BullaEscrow", () => {
  describe("constructor", () => {
    it("stores token, fee, recipient and owner", async () => {
      const f = await loadFixture(deployFixture);
      expect(await f.escrow.token()).to.equal(await f.token.getAddress());
      expect(await f.escrow.feeBps()).to.equal(FEE_BPS);
      expect(await f.escrow.feeRecipient()).to.equal(f.feeRecipient.address);
      expect(await f.escrow.owner()).to.equal(f.owner.address);
    });

    it("rejects zero addresses and fees above the cap", async () => {
      const f = await loadFixture(deployFixture);
      const Escrow = await ethers.getContractFactory("BullaEscrow");
      const t = await f.token.getAddress();
      await expect(Escrow.deploy(ethers.ZeroAddress, f.feeRecipient.address, 50, f.owner.address)).to.be.revertedWithCustomError(Escrow, "ZeroAddress");
      await expect(Escrow.deploy(t, ethers.ZeroAddress, 50, f.owner.address)).to.be.revertedWithCustomError(Escrow, "ZeroAddress");
      await expect(Escrow.deploy(t, f.feeRecipient.address, 1001, f.owner.address)).to.be.revertedWithCustomError(Escrow, "FeeTooHigh");
    });
  });

  describe("happy path", () => {
    it("Draft -> Funded -> Submitted -> Released with fee", async () => {
      const f = await loadFixture(deployFixture);
      const escrowAddr = await f.escrow.getAddress();
      const due = (await time.latest()) + 3600;

      await expect(
        f.escrow.connect(f.seller).createInvoice(f.buyer.address, await f.token.getAddress(), AMOUNT, due, ethers.ZeroHash, FIXTURE_CONTAINER_ID, "Logo")
      )
        .to.emit(f.escrow, "InvoiceCreated")
        .withArgs(1n, f.seller.address, f.buyer.address, await f.token.getAddress(), AMOUNT, due, FIXTURE_CONTAINER_ID, ethers.ZeroHash, "Logo");

      let inv = await f.escrow.getInvoice(1);
      expect(inv.state).to.equal(S.Draft);
      expect(inv.circuitContainerId).to.equal(FIXTURE_CONTAINER_ID);

      await f.token.connect(f.buyer).approve(escrowAddr, AMOUNT);
      await expect(f.escrow.connect(f.buyer).fundInvoice(1)).to.emit(f.escrow, "InvoiceFunded").withArgs(1n, f.buyer.address, AMOUNT);
      expect(await f.token.balanceOf(escrowAddr)).to.equal(AMOUNT);
      expect((await f.escrow.getInvoice(1)).state).to.equal(S.Funded);

      await expect(f.escrow.connect(f.seller).submitDelivery(1, DELIVERY_HASH, "ipfs://example"))
        .to.emit(f.escrow, "DeliverySubmitted")
        .withArgs(1n, f.seller.address, DELIVERY_HASH, "ipfs://example");
      inv = await f.escrow.getInvoice(1);
      expect(inv.state).to.equal(S.Submitted);
      expect(inv.deliveryHash).to.equal(DELIVERY_HASH);
      expect(inv.deliveryURI).to.equal("ipfs://example");

      const fee = (AMOUNT * BigInt(FEE_BPS)) / 10_000n;
      const net = AMOUNT - fee;
      await expect(f.escrow.connect(f.buyer).releaseFunds(1))
        .to.emit(f.escrow, "FundsReleased")
        .withArgs(1n, f.seller.address, net, fee)
        .and.to.emit(f.escrow, "FeePaid")
        .withArgs(1n, f.feeRecipient.address, fee);

      expect(await f.token.balanceOf(f.seller.address)).to.equal(net);
      expect(await f.token.balanceOf(f.feeRecipient.address)).to.equal(fee);
      expect(await f.token.balanceOf(escrowAddr)).to.equal(0n);
      inv = await f.escrow.getInvoice(1);
      expect(inv.state).to.equal(S.Released);
      expect(inv.closedAt).to.be.greaterThan(0n);
    });

    it("seller can resubmit while Submitted", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createDefault(f);
      await fund(f, id);
      await f.escrow.connect(f.seller).submitDelivery(id, DELIVERY_HASH, "v1");
      const h2 = ethers.keccak256(ethers.toUtf8Bytes("v2"));
      await f.escrow.connect(f.seller).submitDelivery(id, h2, "v2");
      expect((await f.escrow.getInvoice(id)).deliveryHash).to.equal(h2);
    });

    it("buyer may release early from Funded", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createDefault(f);
      await fund(f, id);
      await f.escrow.connect(f.buyer).releaseFunds(id);
      expect((await f.escrow.getInvoice(id)).state).to.equal(S.Released);
    });

    it("stores an optional pre-agreed delivery hash at creation", async () => {
      const f = await loadFixture(deployFixture);
      const due = (await time.latest()) + 3600;
      await f.escrow.connect(f.seller).createInvoice(f.buyer.address, await f.token.getAddress(), AMOUNT, due, DELIVERY_HASH, FIXTURE_CONTAINER_ID, "");
      expect((await f.escrow.getInvoice(1)).deliveryHash).to.equal(DELIVERY_HASH);
    });
  });

  describe("double actions", () => {
    it("rejects double release", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createDefault(f);
      await fund(f, id);
      await f.escrow.connect(f.buyer).releaseFunds(id);
      await expect(f.escrow.connect(f.buyer).releaseFunds(id)).to.be.revertedWithCustomError(f.escrow, "WrongState").withArgs(S.Released);
    });

    it("rejects double fund", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createDefault(f);
      await fund(f, id);
      await f.token.connect(f.buyer).approve(await f.escrow.getAddress(), AMOUNT);
      await expect(f.escrow.connect(f.buyer).fundInvoice(id)).to.be.revertedWithCustomError(f.escrow, "WrongState").withArgs(S.Funded);
    });

    it("rejects refund after release and release after refund", async () => {
      const f = await loadFixture(deployFixture);
      const a = await createDefault(f, 3600);
      await fund(f, a.id);
      await f.escrow.connect(f.buyer).releaseFunds(a.id);
      await time.increaseTo(a.due + 1);
      await expect(f.escrow.connect(f.buyer).claimRefund(a.id)).to.be.revertedWithCustomError(f.escrow, "WrongState");

      const b = await createDefault(f, 3600);
      await fund(f, b.id);
      await time.increaseTo(b.due + 1);
      await f.escrow.connect(f.buyer).claimRefund(b.id);
      await expect(f.escrow.connect(f.buyer).releaseFunds(b.id)).to.be.revertedWithCustomError(f.escrow, "WrongState").withArgs(S.Refunded);
      await expect(f.escrow.connect(f.buyer).claimRefund(b.id)).to.be.revertedWithCustomError(f.escrow, "WrongState");
    });
  });

  describe("authorization", () => {
    it("only seller submits, only buyer funds/releases/refunds", async () => {
      const f = await loadFixture(deployFixture);
      const { id, due } = await createDefault(f, 3600);
      await f.token.connect(f.buyer).approve(await f.escrow.getAddress(), AMOUNT);
      await expect(f.escrow.connect(f.seller).fundInvoice(id)).to.be.revertedWithCustomError(f.escrow, "NotBuyer");
      await expect(f.escrow.connect(f.stranger).fundInvoice(id)).to.be.revertedWithCustomError(f.escrow, "NotBuyer");
      await f.escrow.connect(f.buyer).fundInvoice(id);

      await expect(f.escrow.connect(f.buyer).submitDelivery(id, DELIVERY_HASH, "")).to.be.revertedWithCustomError(f.escrow, "NotSeller");
      await expect(f.escrow.connect(f.stranger).submitDelivery(id, DELIVERY_HASH, "")).to.be.revertedWithCustomError(f.escrow, "NotSeller");

      await expect(f.escrow.connect(f.seller).releaseFunds(id)).to.be.revertedWithCustomError(f.escrow, "NotBuyer");
      await expect(f.escrow.connect(f.stranger).releaseFunds(id)).to.be.revertedWithCustomError(f.escrow, "NotBuyer");

      await time.increaseTo(due + 1);
      await expect(f.escrow.connect(f.seller).claimRefund(id)).to.be.revertedWithCustomError(f.escrow, "NotBuyer");
      await expect(f.escrow.connect(f.stranger).claimRefund(id)).to.be.revertedWithCustomError(f.escrow, "NotBuyer");
      await expect(f.escrow.connect(f.stranger).mutualCancel(id)).to.be.revertedWithCustomError(f.escrow, "NotParty");
    });

    it("only owner changes fee recipient; owner cannot touch funds", async () => {
      const f = await loadFixture(deployFixture);
      await expect(f.escrow.connect(f.stranger).setFeeRecipient(f.stranger.address)).to.be.revertedWithCustomError(f.escrow, "OwnableUnauthorizedAccount");
      await expect(f.escrow.connect(f.owner).setFeeRecipient(ethers.ZeroAddress)).to.be.revertedWithCustomError(f.escrow, "ZeroAddress");
      await expect(f.escrow.connect(f.owner).setFeeRecipient(f.newFeeRecipient.address))
        .to.emit(f.escrow, "FeeRecipientUpdated")
        .withArgs(f.feeRecipient.address, f.newFeeRecipient.address);

      const { id } = await createDefault(f);
      await fund(f, id);
      await expect(f.escrow.connect(f.owner).releaseFunds(id)).to.be.revertedWithCustomError(f.escrow, "NotBuyer");
      await expect(f.escrow.connect(f.owner).claimRefund(id)).to.be.revertedWithCustomError(f.escrow, "NotBuyer");
      await expect(f.escrow.connect(f.owner).mutualCancel(id)).to.be.revertedWithCustomError(f.escrow, "NotParty");

      await f.escrow.connect(f.buyer).releaseFunds(id);
      const fee = (AMOUNT * BigInt(FEE_BPS)) / 10_000n;
      expect(await f.token.balanceOf(f.newFeeRecipient.address)).to.equal(fee);
    });

    it("unknown invoice reverts InvoiceNotFound", async () => {
      const f = await loadFixture(deployFixture);
      await expect(f.escrow.getInvoice(99)).to.be.revertedWithCustomError(f.escrow, "InvoiceNotFound").withArgs(99n);
      await expect(f.escrow.connect(f.buyer).fundInvoice(99)).to.be.revertedWithCustomError(f.escrow, "InvoiceNotFound");
    });
  });

  describe("create validation", () => {
    it("validates buyer, amount, due, container", async () => {
      const f = await loadFixture(deployFixture);
      const t = await f.token.getAddress();
      const due = (await time.latest()) + 3600;
      const c = f.escrow.connect(f.seller);
      await expect(c.createInvoice(ethers.ZeroAddress, t, AMOUNT, due, ethers.ZeroHash, FIXTURE_CONTAINER_ID, "")).to.be.revertedWithCustomError(f.escrow, "InvalidBuyer");
      await expect(c.createInvoice(f.seller.address, t, AMOUNT, due, ethers.ZeroHash, FIXTURE_CONTAINER_ID, "")).to.be.revertedWithCustomError(f.escrow, "InvalidBuyer");
      await expect(c.createInvoice(f.buyer.address, t, 0, due, ethers.ZeroHash, FIXTURE_CONTAINER_ID, "")).to.be.revertedWithCustomError(f.escrow, "InvalidAmount");
      await expect(c.createInvoice(f.buyer.address, t, AMOUNT, (await time.latest()) - 1, ethers.ZeroHash, FIXTURE_CONTAINER_ID, "")).to.be.revertedWithCustomError(f.escrow, "DueInPast");
      await expect(c.createInvoice(f.buyer.address, t, AMOUNT, due, ethers.ZeroHash, ethers.ZeroHash, "")).to.be.revertedWithCustomError(f.escrow, "MissingContainerId");
    });

    it("submitDelivery requires a non-zero hash and Funded state", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createDefault(f);
      await expect(f.escrow.connect(f.seller).submitDelivery(id, DELIVERY_HASH, "")).to.be.revertedWithCustomError(f.escrow, "WrongState").withArgs(S.Draft);
      await fund(f, id);
      await expect(f.escrow.connect(f.seller).submitDelivery(id, ethers.ZeroHash, "")).to.be.revertedWithCustomError(f.escrow, "MissingDeliveryHash");
    });

    it("cannot fund or submit after due", async () => {
      const f = await loadFixture(deployFixture);
      const a = await createDefault(f, 3600);
      await f.token.connect(f.buyer).approve(await f.escrow.getAddress(), AMOUNT);
      await time.increaseTo(a.due);
      await expect(f.escrow.connect(f.buyer).fundInvoice(a.id)).to.be.revertedWithCustomError(f.escrow, "PastDue");

      const b = await createDefault(f, 3600);
      await fund(f, b.id);
      await time.increaseTo(b.due);
      await expect(f.escrow.connect(f.seller).submitDelivery(b.id, DELIVERY_HASH, "")).to.be.revertedWithCustomError(f.escrow, "PastDue");
    });
  });

  describe("timeout refund", () => {
    it("too early reverts NotYetDue; after due refunds the buyer in full (Funded)", async () => {
      const f = await loadFixture(deployFixture);
      const { id, due } = await createDefault(f, 3600);
      await fund(f, id);
      const before = await f.token.balanceOf(f.buyer.address);
      await expect(f.escrow.connect(f.buyer).claimRefund(id)).to.be.revertedWithCustomError(f.escrow, "NotYetDue").withArgs(due);
      await time.increaseTo(due);
      await expect(f.escrow.connect(f.buyer).claimRefund(id)).to.emit(f.escrow, "Refunded").withArgs(id, f.buyer.address, AMOUNT);
      expect(await f.token.balanceOf(f.buyer.address)).to.equal(before + AMOUNT);
      expect(await f.token.balanceOf(f.feeRecipient.address)).to.equal(0n);
      expect((await f.escrow.getInvoice(id)).state).to.equal(S.Refunded);
    });

    it("refund also works from Submitted after due", async () => {
      const f = await loadFixture(deployFixture);
      const { id, due } = await createDefault(f, 3600);
      await fund(f, id);
      await f.escrow.connect(f.seller).submitDelivery(id, DELIVERY_HASH, "");
      await time.increaseTo(due + 10);
      await f.escrow.connect(f.buyer).claimRefund(id);
      expect((await f.escrow.getInvoice(id)).state).to.equal(S.Refunded);
    });

    it("refund on an unfunded Draft reverts", async () => {
      const f = await loadFixture(deployFixture);
      const { id, due } = await createDefault(f, 3600);
      await time.increaseTo(due + 1);
      await expect(f.escrow.connect(f.buyer).claimRefund(id)).to.be.revertedWithCustomError(f.escrow, "WrongState").withArgs(S.Draft);
    });
  });

  describe("mutual cancel", () => {
    it("before funding: both consent -> Cancelled, no transfer", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createDefault(f);
      await expect(f.escrow.connect(f.seller).mutualCancel(id)).to.emit(f.escrow, "CancelConsentGiven").withArgs(id, f.seller.address);
      expect((await f.escrow.getInvoice(id)).state).to.equal(S.Draft);
      await expect(f.escrow.connect(f.seller).mutualCancel(id)).to.be.revertedWithCustomError(f.escrow, "AlreadyConsented");
      await expect(f.escrow.connect(f.buyer).mutualCancel(id)).to.emit(f.escrow, "InvoiceCancelled").withArgs(id, 0n);
      const inv = await f.escrow.getInvoice(id);
      expect(inv.state).to.equal(S.Cancelled);
      expect(inv.sellerCancelConsent && inv.buyerCancelConsent).to.equal(true);
      await f.token.connect(f.buyer).approve(await f.escrow.getAddress(), AMOUNT);
      await expect(f.escrow.connect(f.buyer).fundInvoice(id)).to.be.revertedWithCustomError(f.escrow, "WrongState").withArgs(S.Cancelled);
    });

    it("after funding: both consent -> buyer refunded in full, no fee", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createDefault(f);
      await fund(f, id);
      await f.escrow.connect(f.seller).submitDelivery(id, DELIVERY_HASH, "");
      const before = await f.token.balanceOf(f.buyer.address);
      await f.escrow.connect(f.buyer).mutualCancel(id);
      await expect(f.escrow.connect(f.seller).mutualCancel(id)).to.emit(f.escrow, "InvoiceCancelled").withArgs(id, AMOUNT);
      expect(await f.token.balanceOf(f.buyer.address)).to.equal(before + AMOUNT);
      expect(await f.token.balanceOf(f.feeRecipient.address)).to.equal(0n);
      expect(await f.token.balanceOf(await f.escrow.getAddress())).to.equal(0n);
      await expect(f.escrow.connect(f.buyer).releaseFunds(id)).to.be.revertedWithCustomError(f.escrow, "WrongState").withArgs(S.Cancelled);
    });

    it("one-sided consent does not block release", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createDefault(f);
      await fund(f, id);
      await f.escrow.connect(f.seller).mutualCancel(id);
      await f.escrow.connect(f.buyer).releaseFunds(id);
      expect((await f.escrow.getInvoice(id)).state).to.equal(S.Released);
      await expect(f.escrow.connect(f.buyer).mutualCancel(id)).to.be.revertedWithCustomError(f.escrow, "WrongState");
    });
  });

  describe("wrong token", () => {
    it("createInvoice rejects a token other than the configured one", async () => {
      const f = await loadFixture(deployFixture);
      const due = (await time.latest()) + 3600;
      const other = await f.otherToken.getAddress();
      await expect(
        f.escrow.connect(f.seller).createInvoice(f.buyer.address, other, AMOUNT, due, ethers.ZeroHash, FIXTURE_CONTAINER_ID, "")
      ).to.be.revertedWithCustomError(f.escrow, "UnsupportedToken").withArgs(other);
    });

    it("approving a different token does not fund", async () => {
      const f = await loadFixture(deployFixture);
      const { id } = await createDefault(f);
      await f.otherToken.connect(f.buyer).approve(await f.escrow.getAddress(), AMOUNT);
      await expect(f.escrow.connect(f.buyer).fundInvoice(id)).to.be.revertedWithCustomError(f.token, "ERC20InsufficientAllowance");
    });

    it("fee-on-transfer token is rejected at funding", async () => {
      const [owner, seller, buyer, , feeRecipient] = await ethers.getSigners();
      const FOT = await ethers.getContractFactory("FeeOnTransferToken");
      const fot = await FOT.deploy();
      const Escrow = await ethers.getContractFactory("BullaEscrow");
      const escrow = await Escrow.deploy(await fot.getAddress(), feeRecipient.address, FEE_BPS, owner.address);
      await fot.mint(buyer.address, AMOUNT);
      const due = (await time.latest()) + 3600;
      await escrow.connect(seller).createInvoice(buyer.address, await fot.getAddress(), AMOUNT, due, ethers.ZeroHash, FIXTURE_CONTAINER_ID, "");
      await fot.connect(buyer).approve(await escrow.getAddress(), AMOUNT);
      await expect(escrow.connect(buyer).fundInvoice(1)).to.be.revertedWithCustomError(escrow, "InvalidAmount");
    });
  });

  describe("fee math", () => {
    it("quoteRelease rounds down and fee + net == amount", async () => {
      const f = await loadFixture(deployFixture);
      for (const amt of [1n, 199n, 200n, 201n, 12_345_678n, AMOUNT, 2n ** 128n]) {
        const [fee, net] = await f.escrow.quoteRelease(amt);
        expect(fee).to.equal((amt * 50n) / 10_000n);
        expect(fee + net).to.equal(amt);
      }
      const [fee, net] = await f.escrow.quoteRelease(1_000_000n); // 1.00 USDC
      expect(fee).to.equal(5_000n); // 0.005 USDC
      expect(net).to.equal(995_000n);
    });

    it("zero-fee escrow pays the seller in full and emits no FeePaid", async () => {
      const [owner, seller, buyer, , feeRecipient] = await ethers.getSigners();
      const Token = await ethers.getContractFactory("MockERC20");
      const token = await Token.deploy("Mock USDC", "mUSDC", 6);
      const Escrow = await ethers.getContractFactory("BullaEscrow");
      const escrow = await Escrow.deploy(await token.getAddress(), feeRecipient.address, 0, owner.address);
      await token.mint(buyer.address, AMOUNT);
      const due = (await time.latest()) + 3600;
      await escrow.connect(seller).createInvoice(buyer.address, await token.getAddress(), AMOUNT, due, ethers.ZeroHash, FIXTURE_CONTAINER_ID, "");
      await token.connect(buyer).approve(await escrow.getAddress(), AMOUNT);
      await escrow.connect(buyer).fundInvoice(1);
      await expect(escrow.connect(buyer).releaseFunds(1)).to.not.emit(escrow, "FeePaid");
      expect(await token.balanceOf(seller.address)).to.equal(AMOUNT);
    });

    it("tiny amount: fee rounds to zero", async () => {
      const f = await loadFixture(deployFixture);
      const due = (await time.latest()) + 3600;
      await f.escrow.connect(f.seller).createInvoice(f.buyer.address, await f.token.getAddress(), 150n, due, ethers.ZeroHash, FIXTURE_CONTAINER_ID, "");
      await f.token.connect(f.buyer).approve(await f.escrow.getAddress(), 150n);
      await f.escrow.connect(f.buyer).fundInvoice(1);
      await f.escrow.connect(f.buyer).releaseFunds(1);
      expect(await f.token.balanceOf(f.seller.address)).to.equal(150n);
    });
  });

  describe("reentrancy", () => {
    async function reentrantFixture() {
      const [owner, seller, buyer, , feeRecipient] = await ethers.getSigners();
      const RT = await ethers.getContractFactory("ReentrantToken");
      const rt = await RT.deploy();
      const Escrow = await ethers.getContractFactory("BullaEscrow");
      const escrow = await Escrow.deploy(await rt.getAddress(), feeRecipient.address, FEE_BPS, owner.address);
      await rt.mint(buyer.address, AMOUNT * 4n);
      const due = (await time.latest()) + 3600;
      for (let i = 0; i < 2; i++) {
        await escrow.connect(seller).createInvoice(buyer.address, await rt.getAddress(), AMOUNT, due, ethers.ZeroHash, FIXTURE_CONTAINER_ID, "");
        await rt.connect(buyer).approve(await escrow.getAddress(), AMOUNT);
        await escrow.connect(buyer).fundInvoice(i + 1);
      }
      return { escrow, rt, buyer, seller, due };
    }

    it("re-entering releaseFunds during a release reverts the whole tx", async () => {
      const { escrow, rt, buyer } = await loadFixture(reentrantFixture);
      await rt.arm(await escrow.getAddress(), 1 /* Release */, 2);
      await expect(escrow.connect(buyer).releaseFunds(1)).to.be.revertedWithCustomError(escrow, "ReentrancyGuardReentrantCall");
      expect((await escrow.getInvoice(1)).state).to.equal(S.Funded);
      expect(await rt.balanceOf(await escrow.getAddress())).to.equal(AMOUNT * 2n);
    });

    it("re-entering claimRefund during a refund reverts the whole tx", async () => {
      const { escrow, rt, buyer, due } = await loadFixture(reentrantFixture);
      await time.increaseTo(due + 1);
      await rt.arm(await escrow.getAddress(), 2 /* Refund */, 2);
      await expect(escrow.connect(buyer).claimRefund(1)).to.be.revertedWithCustomError(escrow, "ReentrancyGuardReentrantCall");
      expect((await escrow.getInvoice(1)).state).to.equal(S.Funded);
      expect(await rt.balanceOf(await escrow.getAddress())).to.equal(AMOUNT * 2n);
    });

    it("re-entering the same invoice cannot double-pay (state is set before transfer)", async () => {
      const { escrow, rt, buyer } = await loadFixture(reentrantFixture);
      await rt.arm(await escrow.getAddress(), 1 /* Release */, 1);
      await expect(escrow.connect(buyer).releaseFunds(1)).to.be.reverted;
      expect(await rt.balanceOf(await escrow.getAddress())).to.equal(AMOUNT * 2n);
    });
  });
});
