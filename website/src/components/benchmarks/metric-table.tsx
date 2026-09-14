import {
  Caption1,
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  makeStyles,
  SearchBox,
  TableCellLayout,
  tokens,
  type DataGridProps,
  type TableColumnDefinition,
  type TableColumnSizingOptions,
} from "@fluentui/react-components";
import { useMemo, useRef, useState, type ReactNode } from "react";

import type { Theme } from "@typespec/astro-utils/utils/theme";
import { formatMs, formatPercent, formatShare } from "./data.js";
import { trendColor } from "./palette.js";
import { EmptyNote, SectionHeader } from "./section.js";
import { Sparkline } from "./sparkline.js";
import type { MetricRow } from "./types.js";

type SortState = Parameters<NonNullable<DataGridProps["onSortChange"]>>[1];

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
  head: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  numeric: {
    fontVariantNumeric: "tabular-nums",
  },
});

const COLUMN_SIZING: TableColumnSizingOptions = {
  name: { minWidth: 140, idealWidth: 260 },
  latest: { minWidth: 80, idealWidth: 90 },
  delta: { minWidth: 150, idealWidth: 180 },
  share: { minWidth: 70, idealWidth: 80 },
  trend: { minWidth: 90, idealWidth: 100 },
};

const numberOf = (value: number | null) => value ?? -Infinity;

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
  const [sortState, setSortState] = useState<SortState>({
    sortColumn: "latest",
    sortDirection: "descending",
  });

  /** Anchor for shift-click range selection, as an index into `visible`. */
  const anchorRef = useRef<number | null>(null);

  const columns = useMemo(() => {
    const numeric = (node: ReactNode) => (
      <TableCellLayout className={styles.numeric}>{node}</TableCellLayout>
    );
    const all: TableColumnDefinition<MetricRow>[] = [
      createTableColumn<MetricRow>({
        columnId: "name",
        compare: (a, b) => a.name.localeCompare(b.name),
        renderHeaderCell: () => "Metric",
        renderCell: (row) => (
          <TableCellLayout truncate title={row.key}>
            {row.name}
          </TableCellLayout>
        ),
      }),
      createTableColumn<MetricRow>({
        columnId: "latest",
        compare: (a, b) => numberOf(a.latest) - numberOf(b.latest),
        renderHeaderCell: () => "Latest",
        renderCell: (row) => numeric(formatMs(row.latest)),
      }),
      createTableColumn<MetricRow>({
        columnId: "delta",
        compare: (a, b) => numberOf(a.delta) - numberOf(b.delta),
        renderHeaderCell: () => "vs 7-day median",
        renderCell: (row) =>
          numeric(
            row.delta === null ? (
              "—"
            ) : (
              <span style={{ color: trendColor(row.delta, theme) }}>
                {row.delta > 0 ? "+" : "−"}
                {formatMs(Math.abs(row.delta))} ({formatPercent(row.deltaRatio)})
              </span>
            ),
          ),
      }),
      createTableColumn<MetricRow>({
        columnId: "share",
        compare: (a, b) => numberOf(a.share) - numberOf(b.share),
        renderHeaderCell: () => "Share",
        renderCell: (row) => numeric(formatShare(row.share)),
      }),
      createTableColumn<MetricRow>({
        columnId: "trend",
        renderHeaderCell: () => "Trend",
        renderCell: (row) => (
          <Sparkline
            values={row.values}
            color={trendColor(row.delta ?? 0, theme)}
            ariaLabel={`${row.name} trend`}
          />
        ),
      }),
    ];
    return showShare ? all : all.filter((column) => column.columnId !== "share");
  }, [theme, showShare, styles.numeric]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((row) => row.name.toLowerCase().includes(needle))
      : [...rows];
    // Sorted here as well as in the grid so that shift-selected ranges follow
    // the order rows are actually displayed in.
    const compare = columns.find((column) => column.columnId === sortState.sortColumn)?.compare;
    if (compare) {
      filtered.sort((a, b) =>
        sortState.sortDirection === "ascending" ? compare(a, b) : compare(b, a),
      );
    }
    return filtered;
  }, [rows, query, columns, sortState]);

  const visibleKeys = useMemo(() => visible.map((row) => row.key), [visible]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const visibleSelected = useMemo(
    () => visibleKeys.filter((key) => selectedSet.has(key)),
    [visibleKeys, selectedSet],
  );

  const onGridSelectionChange: DataGridProps["onSelectionChange"] = (event, data) => {
    const next = new Set(Array.from(data.selectedItems, String));
    if (singleSelect) {
      onSelectionChange([...next]);
      return;
    }

    const before = new Set(visibleSelected);
    const changed = visibleKeys.filter((key) => next.has(key) !== before.has(key));
    if (changed.length === 1) {
      const index = visibleKeys.indexOf(changed[0]);
      const anchor = anchorRef.current;
      // Shift-click applies the new state across the whole range from the
      // anchor, which is how a group of related rules gets selected at once.
      if ("shiftKey" in event && event.shiftKey && anchor !== null && anchor !== index) {
        const selecting = next.has(changed[0]);
        const [from, to] = anchor < index ? [anchor, index] : [index, anchor];
        for (const key of visibleKeys.slice(from, to + 1)) {
          if (selecting) next.add(key);
          else next.delete(key);
        }
      }
      anchorRef.current = index;
    } else {
      anchorRef.current = null;
    }

    const hidden = selected.filter((key) => !visibleKeys.includes(key));
    onSelectionChange([...hidden, ...visibleKeys.filter((key) => next.has(key))]);
  };

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
            {!singleSelect && visibleSelected.length > 0 && ` · ${visibleSelected.length} charted`}
          </Caption1>
        </div>
      </SectionHeader>

      <div className={styles.scroll}>
        <DataGrid
          items={visible}
          columns={columns}
          getRowId={(row: MetricRow) => row.key}
          size="small"
          aria-label={caption}
          sortable
          sortState={sortState}
          onSortChange={(_, next) => {
            anchorRef.current = null;
            setSortState(next);
          }}
          selectionMode={singleSelect ? "single" : "multiselect"}
          selectedItems={visibleSelected}
          onSelectionChange={onGridSelectionChange}
          resizableColumns
          columnSizingOptions={COLUMN_SIZING}
          resizableColumnsOptions={{ autoFitColumns: false }}
        >
          <DataGridHeader className={styles.head}>
            <DataGridRow
              selectionCell={{
                checkboxIndicator: { "aria-label": "Plot every listed metric" },
                title: "Select every listed metric. Shift-click a row to select a range.",
              }}
            >
              {({ renderHeaderCell }) => (
                <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<MetricRow>>
            {({ item, rowId }) => (
              <DataGridRow<MetricRow>
                key={rowId}
                selectionCell={{ checkboxIndicator: { "aria-label": `Plot ${item.name}` } }}
              >
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
        {visible.length === 0 && <EmptyNote>No metrics match “{query}”.</EmptyNote>}
      </div>
    </section>
  );
}
