import { Caption1, Card, CardHeader, makeStyles, Text, tokens } from "@fluentui/react-components";
import { useMemo } from "react";

import type { Theme } from "@typespec/astro-utils/utils/theme";
import {
  BASELINE_DAYS,
  buildComparisonView,
  buildRows,
  formatMs,
  formatPercent,
  getEmitterNames,
  NOISE_FLOOR_RATIO,
  shortLabel,
  STAGE_LABELS,
} from "./data.js";
import { MetricChart } from "./metric-chart.js";
import { seriesColor, trendColor } from "./palette.js";
import { SectionHeader } from "./section.js";
import { Select } from "./select.js";
import type { HistoryData, TimeRange } from "./types.js";

const useStyles = makeStyles({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: tokens.spacingHorizontalS,
  },
  stats: {
    display: "flex",
    alignItems: "baseline",
    gap: tokens.spacingHorizontalS,
    whiteSpace: "nowrap",
  },
  value: {
    fontVariantNumeric: "tabular-nums",
  },
  change: {
    fontVariantNumeric: "tabular-nums",
    color: tokens.colorNeutralForeground3,
  },
});

/** Metrics worth tracking per service: the pipeline stages plus each emitter. */
export function trackableMetrics(data: HistoryData): string[] {
  const stages = [...STAGE_LABELS, "emit"].filter((label) => data.labels.includes(label));
  const emitters = getEmitterNames(data.labels).map((name) => `emit/${name}`);
  return [...stages, ...emitters];
}

/**
 * One chart per Azure service.
 *
 * Unlike the in-repo baseline, this corpus exists to catch regressions in each
 * individual service, so the services are shown side by side as small multiples
 * rather than averaged or overlaid on a single axis: every service keeps its
 * own y scale, which is what makes a 5% drift visible on a small service that
 * would otherwise be flattened by a large one.
 */
export function ServiceGrid({
  data,
  specNames,
  range,
  metricKey,
  onMetricKey,
  theme,
}: {
  data: HistoryData;
  specNames: string[];
  range: TimeRange;
  metricKey: string;
  onMetricKey: (value: string) => void;
  theme: Theme;
}) {
  const styles = useStyles();

  const view = useMemo(
    () => buildComparisonView(data, metricKey, specNames, range),
    [data, metricKey, specNames, range],
  );

  const rows = useMemo(() => buildRows(view, specNames), [view, specNames]);
  const options = useMemo(
    () => trackableMetrics(data).map((key) => ({ value: key, label: shortLabel(key) })),
    [data],
  );

  // Worst regression first, so a service that slowed down leads the grid.
  const ordered = useMemo(
    () => [...rows].sort((a, b) => (b.deltaRatio ?? -Infinity) - (a.deltaRatio ?? -Infinity)),
    [rows],
  );

  if (view.points.length === 0) return null;

  return (
    <section className={styles.section}>
      <SectionHeader title="Per-service trend" hint="each service on its own scale">
        <Select label="Track" value={metricKey} options={options} onChange={onMetricKey} />
      </SectionHeader>

      <div className={styles.grid}>
        {ordered.map((row, index) => {
          const significant =
            row.deltaRatio !== null && Math.abs(row.deltaRatio) >= NOISE_FLOOR_RATIO;
          const color = seriesColor(index, theme);

          return (
            <Card key={row.key} size="small" appearance="outline">
              <CardHeader
                header={
                  <Text as="h3" weight="semibold" truncate wrap={false}>
                    {row.name}
                  </Text>
                }
                action={
                  <div className={styles.stats}>
                    <Text weight="semibold" className={styles.value}>
                      {formatMs(row.latest)}
                    </Text>
                    <Caption1
                      className={styles.change}
                      style={significant ? { color: trendColor(row.delta!, theme) } : undefined}
                      title={`Compared to the median of the last ${BASELINE_DAYS} days (${formatMs(row.baseline)})`}
                    >
                      {formatPercent(row.deltaRatio)}
                    </Caption1>
                  </div>
                }
              />
              <MetricChart
                points={view.points}
                series={[{ key: row.key, label: row.name, data: row.values, color }]}
                theme={theme}
                height={190}
                yAxisLabel=""
              />
            </Card>
          );
        })}
      </div>
    </section>
  );
}
