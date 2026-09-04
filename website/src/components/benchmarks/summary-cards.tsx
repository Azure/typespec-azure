import type { Theme } from "@typespec/astro-utils/utils/theme";
import { BASELINE_DAYS, formatMs, formatPercent, NOISE_FLOOR_RATIO } from "./data.js";
import { trendColor } from "./palette.js";
import { Sparkline } from "./sparkline.js";
import type { MetricRow } from "./types.js";

/**
 * Headline numbers for the compilation pipeline.
 *
 * Each card compares against a trailing median rather than the previous run, so
 * the badge reflects a real trend instead of single-run jitter.
 */
export function SummaryCards({ rows, theme }: { rows: MetricRow[]; theme: Theme }) {
  const present = rows.filter((row) => row.latest !== null);
  if (present.length === 0) return null;

  return (
    <div className="summaryGrid">
      {present.map((row) => {
        const isSignificant =
          row.deltaRatio !== null && Math.abs(row.deltaRatio) >= NOISE_FLOOR_RATIO;
        const color = isSignificant ? trendColor(row.delta!, theme) : undefined;

        return (
          <article key={row.key} className="summaryCard">
            <header className="summaryCardLabel">{row.name}</header>
            <div className="summaryCardValue">{formatMs(row.latest)}</div>
            <div className="summaryCardFooter">
              <span
                className="summaryCardChange"
                style={color ? { color } : undefined}
                title={`Compared to the median of the last ${BASELINE_DAYS} days (${formatMs(row.baseline)})`}
              >
                {row.deltaRatio === null ? "no baseline" : formatPercent(row.deltaRatio)}
              </span>
              <Sparkline
                values={row.values}
                color={color ?? "currentColor"}
                ariaLabel={`${row.name} trend`}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
