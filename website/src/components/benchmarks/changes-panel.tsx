import { Badge, Button, Card, makeStyles, Text, tokens } from "@fluentui/react-components";

import type { Theme } from "@typespec/astro-utils/utils/theme";
import { BASELINE_DAYS, formatMs, formatPercent, type Changes } from "./data.js";
import { trendColor } from "./palette.js";
import { EmptyNote, SectionHeader } from "./section.js";
import type { MetricRow } from "./types.js";

const useStyles = makeStyles({
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalXXXL}`,
  },
  column: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: tokens.spacingVerticalXS,
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    alignSelf: "stretch",
  },
  item: {
    width: "100%",
    justifyContent: "space-between",
    fontWeight: tokens.fontWeightRegular,
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
            <Text truncate wrap={false}>
              {row.name}
            </Text>
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
      <Card appearance="outline">
        <SectionHeader title="What changed" />
        <EmptyNote>No metric moved meaningfully against its {BASELINE_DAYS}-day median.</EmptyNote>
      </Card>
    );
  }

  return (
    <Card appearance="outline">
      <SectionHeader title="What changed" hint={`latest run vs ${BASELINE_DAYS}-day median`} />
      <div className={styles.grid}>
        <div className={styles.column}>
          <Badge appearance="tint" color="danger">
            Slower
          </Badge>
          <ChangeList
            rows={regressions}
            emptyText="Nothing regressed."
            theme={theme}
            onSelect={onSelect}
          />
        </div>
        <div className={styles.column}>
          <Badge appearance="tint" color="success">
            Faster
          </Badge>
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
