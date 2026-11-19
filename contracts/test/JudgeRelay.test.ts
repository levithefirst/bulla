import { expect } from "chai";
import { GAS_UNITS_PER_ROLE, isAddr, perRunCost, planTopUps, RateLimiter } from "../../shared/judgeRelay";

describe("Judge gas relayer rules (shared/judgeRelay.ts)", () => {
  it("tops each demo wallet up to the per-role budget at the bumped price, and stays under the cap", () => {
    const gp = 24_000_001n;
    const p = planTopUps(gp, [0n, 10n ** 12n]);
    const need = ((gp * 12n) / 10n) * GAS_UNITS_PER_ROLE;
    expect(p.topUps).to.deep.equal([need, need - 10n ** 12n]);
    expect(p.topUps[0] + p.topUps[1] <= p.cap).to.equal(true);
    expect(planTopUps(gp, [need, need * 2n]).topUps).to.deep.equal([0n, 0n]);
    expect(planTopUps(gp, [need, need]).spend).to.equal(0n);
  });
  it("prices a new visitor's run as two full top-ups plus two transfers", () => {
    const gp = 10n;
    expect(perRunCost(gp)).to.equal(12n * GAS_UNITS_PER_ROLE * 2n + 12n * 21_000n * 2n);
  });
  it("rate limits per key in a sliding window", () => {
    const r = new RateLimiter(2, 1_000);
    expect(r.take("a", 0)).to.equal(0);
    expect(r.take("a", 10)).to.equal(0);
    expect(r.take("a", 20)).to.equal(980);
    expect(r.take("b", 20)).to.equal(0);
    expect(r.take("a", 1_001)).to.equal(0);
  });
  it("accepts only 20-byte hex addresses", () => {
    expect(isAddr("0x8888a1022F062158E563d32b4CCA1501B95Fe5fB")).to.equal(true);
    expect(isAddr("0x1234")).to.equal(false);
    expect(isAddr(42)).to.equal(false);
  });
});
