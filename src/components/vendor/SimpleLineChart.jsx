/**
 * Lightweight SVG line chart (no external chart library).
 * series: [{ label, value }]
 */
export default function SimpleLineChart({
  series = [],
  stroke = "#4f46e5",
  height = 148,
  formatValue = (v) => String(v),
}) {
  const W = 320;
  const H = height;
  const padL = 8;
  const padR = 8;
  const padT = 14;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const values = series.map((s) => Number(s.value) || 0);
  const max = Math.max(1, ...values);
  const n = series.length;

  const pts = series.map((s, i) => {
    const x = padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = padT + innerH - (values[i] / max) * innerH;
    return { x, y, label: s.label, value: values[i] };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath =
    pts.length > 0
      ? `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${padT + innerH} L ${pts[0].x.toFixed(1)} ${padT + innerH} Z`
      : "";

  const gridLines = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden={series.length === 0}>
      {gridLines.map((t) => {
        const y = padT + innerH * (1 - t);
        return (
          <line key={t} x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e5e7eb" strokeWidth="1" />
        );
      })}
      {areaPath && <path d={areaPath} fill={stroke} fillOpacity="0.08" />}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {pts.map((p, i) => (
        <g key={p.label || i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="#fff" stroke={stroke} strokeWidth="2">
            <title>{`${p.label}: ${formatValue(p.value)}`}</title>
          </circle>
          <text x={p.x} y={H - 8} textAnchor="middle" fontSize="10" fill="#6b7280">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
