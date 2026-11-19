import { expect } from "chai";
import { addressError, MAX_INVOICE_TOTAL, parseAmount, totalError, ZERO_ADDRESS } from "../../shared/validate";

describe("Create-form validation (shared/validate.ts)", () => {
  const bad = (raw: string) => {
    const r = parseAmount(raw, 6, "USDC");
    expect(r.ok, raw).to.equal(false);
    return r.ok ? "" : r.error;
  };
  it("rejects empty, zero, negative, exponent, non-numeric and comma amounts", () => {
    expect(bad("")).to.match(/Enter an amount/);
    expect(bad("   ")).to.match(/Enter an amount/);
    expect(bad("0")).to.match(/greater than zero/);
    expect(bad("0.000000")).to.match(/greater than zero/);
    expect(bad("-5")).to.match(/greater than zero/);
    expect(bad("1e30")).to.match(/exponent/);
    expect(bad("abc")).to.match(/Enter a number/);
    expect(bad("1,5")).to.match(/comma/);
    expect(bad("1.")).to.match(/Enter a number/);
    expect(bad(".5")).to.match(/Enter a number/);
  });
  it("rejects more decimals than the token has instead of rounding", () => {
    expect(bad("0.0000001")).to.match(/6 decimals/);
    expect(bad("1.1234567")).to.match(/6 decimals/);
  });
  it("caps one amount at the per-invoice limit", () => {
    expect(bad("1000000.000001")).to.match(/At most 1,000,000 USDC/);
    expect(bad("999999999999999999999999999999")).to.match(/At most/);
  });
  it("accepts exact values", () => {
    expect(parseAmount("1.123456", 6)).to.deep.equal({ ok: true, value: 1_123_456n });
    expect(parseAmount(" 100 ", 6)).to.deep.equal({ ok: true, value: 100_000_000n });
    expect(parseAmount("1000000", 6)).to.deep.equal({ ok: true, value: MAX_INVOICE_TOTAL * 1_000_000n });
  });
  it("flags a total above the limit", () => {
    expect(totalError(MAX_INVOICE_TOTAL * 1_000_000n, 6)).to.equal(null);
    expect(totalError(MAX_INVOICE_TOTAL * 1_000_000n + 1n, 6, "USDC")).to.match(/above the 1,000,000 USDC/);
  });
  it("rejects zero, own, escrow and token addresses as the buyer", () => {
    const me = "0x00f9b7a48F4B3eCdcc8288C2295E59132143B3b0";
    const escrow = "0x35a7862e64b60857aDd42a8B8621DB8d9b4B5E07";
    const token = "0xB6CEceAB302E2E4948951eE7843FC24E92933061";
    const opts = { self: me, reserved: { "the escrow contract": escrow, "the token contract": token } } as const;
    expect(addressError("", "buyer", opts)).to.match(/Enter the buyer/);
    expect(addressError("0x123", "buyer", opts)).to.match(/valid 0x address/);
    expect(addressError(ZERO_ADDRESS, "buyer", opts)).to.match(/zero address/);
    expect(addressError(me.toLowerCase(), "buyer", opts)).to.match(/your own address/);
    expect(addressError(escrow, "buyer", opts)).to.match(/escrow contract/);
    expect(addressError(token.toLowerCase(), "buyer", opts)).to.match(/token contract/);
    expect(addressError("0x8888a1022F062158E563d32b4CCA1501B95Fe5fB", "buyer", opts)).to.equal(null);
  });
});
