/**
 * Create-form input rules, free of browser and chain dependencies so they can be unit tested.
 * Amounts are parsed exactly (no rounding): a value with more decimals than the token has is rejected.
 */
import { getAddress, isAddress, parseUnits, type Address } from "viem";

/** Per-invoice cap on the summed milestone amounts, in whole tokens. A sanity limit for an unaudited escrow. */
export const MAX_INVOICE_TOTAL = 1_000_000n;

export type AmountResult = { ok: true; value: bigint } | { ok: false; error: string };

const DECIMAL = /^\d+(\.\d+)?$/;

export function parseAmount(raw: string, decimals: number, symbol = "tokens"): AmountResult {
  const v = raw.trim();
  if (!v) return { ok: false, error: "Enter an amount." };
  if (v.includes(",")) return { ok: false, error: "Use a dot for decimals, not a comma (for example 1.5)." };
  if (v.startsWith("-")) return { ok: false, error: "The amount must be greater than zero." };
  if (/e/i.test(v)) return { ok: false, error: "Write the amount as a plain number, without exponents." };
  if (!DECIMAL.test(v)) return { ok: false, error: "Enter a number, like 100 or 12.5." };
  const frac = v.split(".")[1] ?? "";
  if (frac.length > decimals) return { ok: false, error: `${symbol} has ${decimals} decimals at most. Remove the extra digits.` };
  const value = parseUnits(v, decimals);
  if (value <= 0n) return { ok: false, error: "The amount must be greater than zero." };
  if (value > MAX_INVOICE_TOTAL * 10n ** BigInt(decimals)) return { ok: false, error: `At most ${MAX_INVOICE_TOTAL.toLocaleString("en-US")} ${symbol} per invoice.` };
  return { ok: true, value };
}

/** Error for the whole invoice total (each amount already valid), or null. */
export function totalError(total: bigint, decimals: number, symbol = "tokens"): string | null {
  return total > MAX_INVOICE_TOTAL * 10n ** BigInt(decimals) ? `The invoice total is above the ${MAX_INVOICE_TOTAL.toLocaleString("en-US")} ${symbol} limit per invoice.` : null;
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

export type AddressCheck = { reserved?: Record<string, Address | null | undefined>; self?: Address | null };

/** Validates a counterparty address. `reserved` maps a description (e.g. "the escrow contract") to an address that may not be used. */
export function addressError(raw: string, role: string, opts: AddressCheck = {}): string | null {
  const v = raw.trim();
  if (!v) return `Enter the ${role} address.`;
  if (!isAddress(v, { strict: false })) return "Enter a valid 0x address (42 characters).";
  const a = getAddress(v);
  if (a === ZERO_ADDRESS) return `The zero address cannot be the ${role}: nobody controls it, so funds sent there are lost.`;
  if (opts.self && a === getAddress(opts.self)) return `The ${role} cannot be your own address.`;
  for (const [what, r] of Object.entries(opts.reserved ?? {})) if (r && a === getAddress(r)) return `That is ${what}, not a person. Enter the ${role}'s wallet address.`;
  return null;
}
