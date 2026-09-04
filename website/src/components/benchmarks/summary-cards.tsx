import { Caption1, Card, makeStyles, Text, tokens } from "@fluentui/react-components";

import type { Theme } from "@typespec/astro-utils/utils/theme";
import { BASELINE_DAYS, formatMs, formatPercent, NOISE_FLOOR_RATIO } from "./data.js";
import { trendColor } from "./palette.js";
import { Sparkline } from "./sparkline.js";
import type { MetricRow } from "./types.js";

const useStyles = makeStyles({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: tokens.spacingHorizontalS,
  },
  card: {
    gap: tokens.spacingVerticalXXS,
  },
  label: {
    color: tokens.colorNeutralForeground3,
    textTransform: "capitalize",
  },
  value: {
    fontVariantNumeric: "tabular-nums",
    lineHeight: tokens.lineHeightBase500,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground3,
  },
  change: {
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
});

/**
 * Headline numbers for the compilation pipeline.
 *
 * Each card compares against a trailing median rather than the previous run, so
 * the badge reflects a real trend instead of single-run jitter.
 */
export function SummaryCards({ rows, theme }: { rows: MetricRow[]; theme: Theme }) {
  const styles = useStyles();
  const present = rows.filter((row) => row.latest !== null);
  if (present.length === 0) return null;

  return (
    <div className={styles.grid}>
      {present.map((row) => {
        const isSignificant =
          row.deltaRatio !== null && Math.abs(row.deltaRatio) >= NOISE_FLOOR_RATIO;
        const color = isSignificant ? trendColor(row.delta!, theme) : undefined;

        return (
          <Card key={row.key} className={styles.card} size="small" appearance="outline">
            <Caption1 className={styles.label} as="h3">
              {row.name}
            </Caption1>
            <Text size={600} weight="semibold" className={styles.value}>
              {formatMs(row.latest)}
            </Text>
            <div className={styles.footer}>
              <Caption1
                className={styles.change}
                style={color ? { color } : undefined}
                title={`Compared to the median of the last ${BASELINE_DAYS} days (${formatMs(row.baseline)})`}
              >
                {row.deltaRatio === null ? "no baseline" : formatPercent(row.deltaRatio)}
              </Caption1>
              <Sparkline
                values={row.values}
                color={color ?? "currentColor"}
                ariaLabel={`${row.name} trend`}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
