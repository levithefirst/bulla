import { formatUnits, isAddress, isHex, pad, getAddress, type Hex } from "viem";

export const shortAddr = (a?: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

export function fmtAmount(v: bigint, decimals: number, symbol?: string) {
  const s = formatUnits(v, decimals);
  const [i, f = ""] = s.split(".");
  const fx = f.replace(/0+$/, "");
  const withSep = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${withSep}${fx ? "." + fx : ""}${symbol ? " " + symbol : ""}`;
}

export function fmtTime(ts: bigint | number) {
  const n = Number(ts);
  if (!n) return "—";
  return new Date(n * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function fmtDuration(seconds: number) {
  const s = Math.abs(Math.floor(seconds));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Accepts a container address (20 bytes) or a full bytes32. Returns bytes32 or null. */
export function parseContainerId(input: string): Hex | null {
  const v = input.trim();
  if (isAddress(v)) return pad(getAddress(v), { size: 32 });
  if (isHex(v) && v.length === 66) return v.toLowerCase() as Hex;
  return null;
}

/** If the bytes32 is a left-padded address, return it (that is a TapeOut container address). */
export function containerAddressOf(id: Hex): `0x${string}` | null {
  if (!/^0x0{24}[0-9a-fA-F]{40}$/.test(id)) return null;
  const a = `0x${id.slice(26)}`;
  return isAddress(a) ? getAddress(a) : null;
}

export const ZERO32 = "0x0000000000000000000000000000000000000000000000000000000000000000";
