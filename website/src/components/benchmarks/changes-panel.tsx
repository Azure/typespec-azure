import {
  Button,
  Caption1,
  Card,
  makeStyles,
  mergeClasses,
  tokens,
} from "@fluentui/react-components";

import type { Theme } from "@typespec/astro-utils/utils/theme";
import { BASELINE_DAYS, formatMs, formatPercent, type Changes } from "./data.js";
import { trendColor } from "./palette.js";
import { EmptyNote, SectionHeader } from "./section.js";
import type { MetricRow } from "./types.js";

const useStyles = makeStyles({
  card: {
    gap: tokens.spacingVerticalM,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalXXXL}`,
  },
  heading: {
    display: "block",
    marginBottom: tokens.spacingVerticalXS,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: tokens.fontWeightSemibold,
  },
  slower: {
    color: tokens.colorPaletteRedForeground1,
  },
  faster: {
    color: tokens.colorPaletteGreenForeground1,
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  item: {
    width: "100%",
    justifyContent: "space-between",
    fontWeight: tokens.fontWeightRegular,
  },
  name: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  values: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  absolute: {
    color: tokens.colorNeutralForeground3,
  },
});

function ChangeList({
  rows,
  emptyText,
  theme,
  onSelect,
}: {
  rows: MetricRow[];
  emptyText: string;
  theme: Theme;
  onSelect: (row: MetricRow) => void;
}) {
  const styles = useStyles();
  if (rows.length === 0) return <EmptyNote>{emptyText}</EmptyNote>;

  return (
    <ul className={styles.list}>
      {rows.map((row) => (
        <li key={row.key}>
          <Button
            appearance="subtle"
            size="small"
            className={styles.item}
            title={row.key}
            onClick={() => onSelect(row)}
          >
            <span className={styles.name}>{row.name}</span>
            <span className={styles.values} style={{ color: trendColor(row.delta!, theme) }}>
              {formatPercent(row.deltaRatio)}
              <span className={styles.absolute}>
                {row.delta! > 0 ? "+" : "−"}
                {formatMs(Math.abs(row.delta!))}
              </span>
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Ranked movers across every metric.
 *
 * The dashboard's main question is "what got slower?", which previously
 * required reading overlapping lines. Selecting an entry jumps to it in the
 * chart.
 */
export function ChangesPanel({
  changes,
  theme,
  onSelect,
}: {
  changes: Changes;
  theme: Theme;
  onSelect: (row: MetricRow) => void;
}) {
  const styles = useStyles();
  const { regressions, improvements } = changes;

  if (regressions.length === 0 && improvements.length === 0) {
    return (
      <Card className={styles.card} appearance="outline">
        <SectionHeader title="What changed" />
        <EmptyNote>No metric moved meaningfully against its {BASELINE_DAYS}-day median.</EmptyNote>
      </Card>
    );
  }

  return (
    <Card className={styles.card} appearance="outline">
      <SectionHeader title="What changed" hint={`latest run vs ${BASELINE_DAYS}-day median`} />
      <div className={styles.grid}>
        <div>
          <Caption1 as="h3" className={mergeClasses(styles.heading, styles.slower)}>
            Slower
          </Caption1>
          <ChangeList
            rows={regressions}
            emptyText="Nothing regressed."
            theme={theme}
            onSelect={onSelect}
          />
        </div>
        <div>
          <Caption1 as="h3" className={mergeClasses(styles.heading, styles.faster)}>
            Faster
          </Caption1>
          <ChangeList
            rows={improvements}
            emptyText="Nothing improved."
            theme={theme}
            onSelect={onSelect}
          />
        </div>
      </div>
    </Card>
  );
}
