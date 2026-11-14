import { useMemo } from "react";
import { encode } from "uqr";

/** QR code as inline SVG (bundled encoder, no network). Dark modules on a white tile so it scans in both themes. */
export function Qr({ value, size = 168, label }: { value: string; size?: number; label: string }) {
  const { d, n } = useMemo(() => {
    const { data } = encode(value, { ecc: "M", border: 2 });
    const n = data.length;
    let d = "";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (data[y][x]) d += `M${x} ${y}h1v1h-1z`;
    return { d, n };
  }, [value]);
  return (
    <svg className="qr" role="img" aria-label={label} viewBox={`0 0 ${n} ${n}`} width={size} height={size} shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#ffffff" />
      <path d={d} fill="#1e1811" />
    </svg>
  );
}
