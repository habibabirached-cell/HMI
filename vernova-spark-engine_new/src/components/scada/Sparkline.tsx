export function Sparkline({
  values,
  width = 320,
  height = 40,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-full text-lime" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={2} />
    </svg>
  );
}