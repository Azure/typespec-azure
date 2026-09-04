import { useMemo } from "react";

const WIDTH = 88;
const HEIGHT = 22;
const PADDING = 2;

/**
 * A compact trend line for a single metric, so the table and summary cards can
 * show direction without opening the full chart.
 */
export function Sparkline({
  values,
  color,
  ariaLabel,
}: {
  values: (number | null)[];
  color: string;
  ariaLabel?: string;
}) {
  const path = useMemo(() => {
    const present = values
      .map((value, index) => ({ value, index }))
      .filter((p): p is { value: number; index: number } => p.value !== null);
    if (present.length < 2) return null;

    const min = Math.min(...present.map((p) => p.value));
    const max = Math.max(...present.map((p) => p.value));
    const span = max - min || 1;
    const usableHeight = HEIGHT - PADDING * 2;
    const lastIndex = values.length - 1 || 1;

    return present
      .map((p, i) => {
        const x = (p.index / lastIndex) * WIDTH;
        const y = PADDING + usableHeight - ((p.value - min) / span) * usableHeight;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [values]);

  if (!path) return <span className="sparklineEmpty">—</span>;

  return (
    <svg
      className="sparkline"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
    >
      <path d={path} fill="none" stroke={color} strokeWidth={1.25} strokeLinejoin="round" />
    </svg>
  );
}
