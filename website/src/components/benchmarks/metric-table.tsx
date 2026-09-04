import {
  Caption1,
  Checkbox,
  makeStyles,
  mergeClasses,
  SearchBox,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  tokens,
} from "@fluentui/react-components";
import { useCallback, useMemo, useRef, useState } from "react";

import type { Theme } from "@typespec/astro-utils/utils/theme";
import { formatMs, formatPercent, formatShare } from "./data.js";
import { trendColor } from "./palette.js";
import { EmptyNote, SectionHeader } from "./section.js";
import { Sparkline } from "./sparkline.js";
import type { MetricRow } from "./types.js";

type SortKey = "name" | "latest" | "delta" | "share";
type SortDirection = "ascending" | "descending";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
  },
  count: {
    color: tokens.colorNeutralForeground3,
    whiteSpace: "nowrap",
  },
  scroll: {
    maxHeight: "26rem",
    overflow: "auto",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  table: {
    // Columns have fixed widths, so scroll sideways rather than letting them
    // collide once the viewport gets narrower than the table.
    minWidth: "44rem",
  },
  stickyHead: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  // Fluent lays table cells out with flex, so columns need explicit sizing and
  // `minWidth: 0` for long rule names to ellipsize instead of overrunning.
  toggleCell: {
    flex: "0 0 3.5rem",
  },
  nameCell: {
    flex: "1 1 auto",
    minWidth: 0,
  },
  numericCell: {
    flex: "0 0 6.5rem",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  deltaCell: {
    flexBasis: "11rem",
  },
  shareCell: {
    flexBasis: "5.5rem",
  },
  trendCell: {
    flex: "0 0 6rem",
  },
  name: {
    display: "block",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

function compare(a: MetricRow, b: MetricRow, key: SortKey): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "latest":
      return (a.latest ?? -Infinity) - (b.latest ?? -Infinity);
    case "delta":
      return (a.delta ?? -Infinity) - (b.delta ?? -Infinity);
    case "share":
      return (a.share ?? -Infinity) - (b.share ?? -Infinity);
  }
}

/**
 * The full metric list, ranked and searchable.
 *
 * This is what makes dense sections usable: rather than drawing every rule on
 * one chart, the chart shows a manageable selection and this table answers
 * "what is slow" and "what moved" directly. Rows can be added to the chart
 * individually, as a shift-selected range, or all at once.
 */
export function MetricTable({
  rows,
  selected,
  onSelectionChange,
  theme,
  showShare,
  caption,
  singleSelect,
}: {
  rows: MetricRow[];
  selected: string[];
  onSelectionChange: (keys: string[]) => void;
  theme: Theme;
  showShare: boolean;
  caption: string;
  /** Compare mode plots one metric across specs, so only one row applies. */
  singleSelect?: boolean;
}) {
  const styles = useStyles();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("latest");
  const [sortDirection, setSortDirection] = useState<SortDirection>("descending");

  /** Anchor for shift-click range selection, as an index into `visible`. */
  const anchorRef = useRef<number | null>(null);
  /** Whether shift was held for the click that produced the next change event. */
  const shiftRef = useRef(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((row) => row.name.toLowerCase().includes(needle))
      : [...rows];
    filtered.sort((a, b) => {
      const result = compare(a, b, sortKey);
      return sortDirection === "ascending" ? result : -result;
    });
    return filtered;
  }, [rows, query, sortKey, sortDirection]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const visibleSelectedCount = useMemo(
    () => visible.reduce((count, row) => count + (selectedSet.has(row.key) ? 1 : 0), 0),
    [visible, selectedSet],
  );

  const sort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((d) => (d === "ascending" ? "descending" : "ascending"));
    } else {
      setSortKey(key);
      setSortDirection(key === "name" ? "ascending" : "descending");
    }
    anchorRef.current = null;
  };

  const headerProps = (key: SortKey) => ({
    sortable: true,
    sortDirection: sortKey === key ? sortDirection : undefined,
    onClick: () => sort(key),
  });

  const onRowChange = useCallback(
    (index: number) => {
      const row = visible[index];
      if (singleSelect) {
        onSelectionChange([row.key]);
        anchorRef.current = index;
        return;
      }

      // Shift-click applies the new state across the whole range from the
      // anchor, which is how a group of related rules gets selected at once.
      const anchor = anchorRef.current;
      if (shiftRef.current && anchor !== null && anchor !== index) {
        const [from, to] = anchor < index ? [anchor, index] : [index, anchor];
        const selecting = !selectedSet.has(row.key);
        const next = new Set(selected);
        for (const ranged of visible.slice(from, to + 1)) {
          if (selecting) next.add(ranged.key);
          else next.delete(ranged.key);
        }
        onSelectionChange([...next]);
        return;
      }

      anchorRef.current = index;
      onSelectionChange(
        selectedSet.has(row.key)
          ? selected.filter((key) => key !== row.key)
          : [...selected, row.key],
      );
    },
    [visible, selected, selectedSet, onSelectionChange, singleSelect],
  );

  const toggleAllVisible = useCallback(() => {
    const next = new Set(selected);
    if (visibleSelectedCount === visible.length) {
      for (const row of visible) next.delete(row.key);
    } else {
      for (const row of visible) next.add(row.key);
    }
    anchorRef.current = null;
    onSelectionChange([...next]);
  }, [selected, visible, visibleSelectedCount, onSelectionChange]);

  const allChecked =
    visible.length > 0 && visibleSelectedCount === visible.length
      ? true
      : visibleSelectedCount > 0
        ? "mixed"
        : false;

  return (
    <section className={styles.root}>
      <SectionHeader title={caption}>
        <div className={styles.controls}>
          <SearchBox
            size="small"
            placeholder="Filter metrics"
            value={query}
            onChange={(_, value) => setQuery(value.value)}
          />
          <Caption1 className={styles.count}>
            {visible.length === rows.length
              ? `${rows.length} metrics`
              : `${visible.length} of ${rows.length} metrics`}
            {!singleSelect && visibleSelectedCount > 0 && ` · ${visibleSelectedCount} charted`}
          </Caption1>
        </div>
      </SectionHeader>

      <div className={styles.scroll}>
        <Table size="small" aria-label={caption} className={styles.table}>
          <TableHeader className={styles.stickyHead}>
            <TableRow>
              <TableHeaderCell className={styles.toggleCell}>
                {singleSelect ? (
                  "Chart"
                ) : (
                  <Checkbox
                    checked={allChecked}
                    onChange={toggleAllVisible}
                    aria-label={
                      allChecked === true ? "Remove all from the chart" : "Plot all listed metrics"
                    }
                    title="Select every listed metric. Shift-click a row to select a range."
                  />
                )}
              </TableHeaderCell>
              <TableHeaderCell className={styles.nameCell} {...headerProps("name")}>
                Metric
              </TableHeaderCell>
              <TableHeaderCell className={styles.numericCell} {...headerProps("latest")}>
                Latest
              </TableHeaderCell>
              <TableHeaderCell
                className={mergeClasses(styles.numericCell, styles.deltaCell)}
                {...headerProps("delta")}
              >
                vs 7-day median
              </TableHeaderCell>
              {showShare && (
                <TableHeaderCell
                  className={mergeClasses(styles.numericCell, styles.shareCell)}
                  {...headerProps("share")}
                >
                  Share
                </TableHeaderCell>
              )}
              <TableHeaderCell className={styles.trendCell}>Trend</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row, index) => {
              const isSelected = selectedSet.has(row.key);
              const delta = row.delta;
              return (
                <TableRow key={row.key} appearance={isSelected ? "brand" : "none"}>
                  <TableCell
                    className={styles.toggleCell}
                    onClickCapture={(event) => {
                      shiftRef.current = event.shiftKey;
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onChange={() => onRowChange(index)}
                      aria-label={`Plot ${row.name}`}
                    />
                  </TableCell>
                  <TableCell className={styles.nameCell}>
                    <span className={styles.name} title={row.key}>
                      {row.name}
                    </span>
                  </TableCell>
                  <TableCell className={styles.numericCell}>{formatMs(row.latest)}</TableCell>
                  <TableCell className={mergeClasses(styles.numericCell, styles.deltaCell)}>
                    {delta === null ? (
                      "—"
                    ) : (
                      <span style={{ color: trendColor(delta, theme) }}>
                        {delta > 0 ? "+" : "−"}
                        {formatMs(Math.abs(delta))} ({formatPercent(row.deltaRatio)})
                      </span>
                    )}
                  </TableCell>
                  {showShare && (
                    <TableCell className={mergeClasses(styles.numericCell, styles.shareCell)}>
                      {formatShare(row.share)}
                    </TableCell>
                  )}
                  <TableCell className={styles.trendCell}>
                    <Sparkline
                      values={row.values}
                      color={trendColor(delta ?? 0, theme)}
                      ariaLabel={`${row.name} trend`}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {visible.length === 0 && <EmptyNote>No metrics match “{query}”.</EmptyNote>}
      </div>
    </section>
  );
}
