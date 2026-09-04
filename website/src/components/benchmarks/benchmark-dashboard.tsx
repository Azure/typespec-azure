import {
  Button,
  Dropdown,
  Field,
  makeStyles,
  mergeClasses,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Option,
  Skeleton,
  SkeletonItem,
  Tab,
  TabList,
  tokens,
} from "@fluentui/react-components";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FluentLayout } from "@components/fluent/fluent-layout";
import { useTheme } from "@typespec/astro-utils/utils/theme-react";

import { ChangesPanel } from "./changes-panel.js";
import {
  buildComparisonView,
  buildMetricView,
  buildRows,
  bySlowest,
  collectSpecNames,
  detectChanges,
  emitterHasSteps,
  getEmitterNames,
  isAggregate,
  shortLabel,
  STAGE_LABELS,
  SUMMARY_LABELS,
} from "./data.js";
import { DatasetSwitch } from "./dataset-switch.js";
import { FilterBar } from "./filter-bar.js";
import { MetricChart, SeriesChips } from "./metric-chart.js";
import { MetricTable } from "./metric-table.js";
import { seriesColor } from "./palette.js";
import { SectionHeader } from "./section.js";
import { ServiceGrid, trackableMetrics } from "./service-grid.js";
import { SummaryCards } from "./summary-cards.js";
import type {
  Dataset,
  HistoryData,
  MetricRow,
  MetricView,
  Series,
  Tab as TabKey,
  TimeRange,
} from "./types.js";
import { getHistoryUrl, readParams, writeParams } from "./url.js";

/** How many series a dense chart plots before the table takes over. */
const DEFAULT_SERIES_COUNT = 8;

const useStyles = makeStyles({
  root: {
    color: tokens.colorNeutralForeground1,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXL,
  },
  // A refetch keeps the previous corpus on screen instead of blanking the page.
  stale: {
    opacity: 0.55,
    pointerEvents: "none",
    transition: "opacity 0.15s ease-in",
  },
  tabs: {
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  chartSection: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalL,
  },
  loadingCards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: tokens.spacingHorizontalS,
  },
});

const TAB_LIST: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "linter", label: "Linter rules" },
  { key: "validation", label: "Validators" },
  { key: "emitters", label: "Emitters" },
];

/** The aggregate each tab's metrics roll up into. */
const TAB_PARENT: Record<TabKey, string> = {
  overview: "total",
  linter: "linter",
  validation: "validation",
  emitters: "emit",
};

const TAB_CAPTION: Record<TabKey, string> = {
  overview: "Compilation stages",
  linter: "Linter rules",
  validation: "Validators",
  emitters: "Emitters",
};

/** Metric keys belonging to a tab, in the order they should be ranked. */
function tabKeys(view: MetricView, tab: TabKey): string[] {
  switch (tab) {
    case "overview":
      return STAGE_LABELS.filter((label) => view.values[label]);
    case "linter":
      return view.labels.filter((l) => l.startsWith("linter/"));
    case "validation":
      return view.labels.filter((l) => l.startsWith("validation/"));
    case "emitters":
      return getEmitterNames(view.labels)
        .map((name) => `emit/${name}`)
        .filter((key) => view.values[key]);
  }
}

function toSeries(
  keys: string[],
  view: MetricView,
  theme: ReturnType<typeof useTheme>,
  labelOf: (key: string) => string = shortLabel,
): Series[] {
  return keys.map((key, index) => ({
    key,
    label: labelOf(key),
    data: view.values[key] ?? [],
    color: seriesColor(index, theme),
  }));
}

function LoadingState() {
  const styles = useStyles();
  return (
    <Skeleton aria-label="Loading benchmark data">
      <div className={styles.loading}>
        <SkeletonItem shape="rectangle" size={40} />
        <div className={styles.loadingCards}>
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonItem key={i} shape="rectangle" size={72} />
          ))}
        </div>
        <SkeletonItem shape="rectangle" size={128} />
      </div>
    </Skeleton>
  );
}

function Dashboard() {
  const styles = useStyles();
  const theme = useTheme();
  const initial = useMemo(readParams, []);

  const [data, setData] = useState<HistoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState<Dataset>(initial.dataset);
  const [tab, setTab] = useState<TabKey>(initial.tab);
  const [spec, setSpec] = useState(initial.spec);
  const [range, setRange] = useState<TimeRange>(initial.range);
  const [compare, setCompare] = useState(initial.compare);
  const [stepEmitter, setStepEmitter] = useState<string>("");
  const [serviceMetric, setServiceMetric] = useState("total");

  /** Explicit chart selection per tab; an empty entry means "use the defaults". */
  const [selection, setSelection] = useState<Partial<Record<TabKey, string[]>>>(() =>
    initial.series.length > 0 ? { [initial.tab]: initial.series } : {},
  );

  const historyUrl = useMemo(() => getHistoryUrl(dataset), [dataset]);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    let cancelled = false;
    fetch(historyUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload: HistoryData) => {
        if (cancelled) return;
        setData(payload);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [historyUrl]);

  useEffect(() => fetchData(), [fetchData]);

  const view = useMemo(
    () => (data ? buildMetricView(data, spec, range) : null),
    [data, spec, range],
  );
  const specNames = useMemo(() => (data ? collectSpecNames(data) : []), [data]);
  const hasSpecMetrics = specNames.length > 1;

  // Reset a spec selection that does not exist in the newly loaded dataset.
  useEffect(() => {
    if (data && spec !== "all" && !specNames.includes(spec)) setSpec("all");
  }, [data, spec, specNames]);

  const keys = useMemo(() => (view ? tabKeys(view, tab) : []), [view, tab]);
  const parentKey = TAB_PARENT[tab];

  const rows = useMemo(
    () => (view ? bySlowest(buildRows(view, keys, parentKey)) : []),
    [view, keys, parentKey],
  );

  const defaultSelection = useMemo(
    () => rows.slice(0, DEFAULT_SERIES_COUNT).map((row) => row.key),
    [rows],
  );

  const selectedKeys = useMemo(() => {
    const explicit = selection[tab];
    if (!explicit) return defaultSelection;
    const available = new Set(keys);
    return explicit.filter((key) => available.has(key));
  }, [selection, tab, defaultSelection, keys]);

  const setSelectedKeys = useCallback(
    (next: string[]) => {
      setSelection((current) => ({ ...current, [tab]: next }));
    },
    [tab],
  );

  const removeSeries = useCallback(
    (key: string) => {
      setSelection((current) => {
        const base = current[tab] ?? defaultSelection;
        return { ...current, [tab]: base.filter((k) => k !== key) };
      });
    },
    [tab, defaultSelection],
  );

  const focusSeries = useCallback(
    (row: MetricRow) => {
      const owningTab =
        TAB_LIST.find(({ key }) => (view ? tabKeys(view, key).includes(row.key) : false))?.key ??
        tab;
      setTab(owningTab);
      setSelection((current) => ({ ...current, [owningTab]: [row.key] }));
    },
    [view, tab],
  );

  // Compare mode plots the first selected metric across every spec. The Azure
  // services corpus gets a chart per service instead, so it is not offered.
  const canCompare = hasSpecMetrics && dataset === "main";
  const primaryKey = selectedKeys[0] ?? keys[0];
  const comparing = compare && canCompare && primaryKey !== undefined;

  const chartView = useMemo(() => {
    if (!data || !view) return null;
    if (!comparing) return view;
    return buildComparisonView(data, primaryKey, specNames, range);
  }, [data, view, comparing, primaryKey, specNames, range]);

  const chartSeries = useMemo(() => {
    if (!chartView) return [];
    return comparing
      ? toSeries(specNames, chartView, theme, (key) => key)
      : toSeries(selectedKeys, chartView, theme);
  }, [chartView, comparing, specNames, selectedKeys, theme]);

  const summaryRows = useMemo(
    () =>
      view
        ? buildRows(
            view,
            SUMMARY_LABELS.filter((label) => view.values[label]),
          )
        : [],
    [view],
  );

  const changes = useMemo(() => {
    if (!view) return { regressions: [], improvements: [] };
    const individualMetrics = view.labels.filter((label) => !isAggregate(label));
    return detectChanges(buildRows(view, individualMetrics));
  }, [view]);

  // Emitter step breakdown.
  const emittersWithSteps = useMemo(() => {
    if (!view) return [];
    return getEmitterNames(view.labels).filter((name) => emitterHasSteps(view.labels, name));
  }, [view]);

  useEffect(() => {
    if (emittersWithSteps.length > 0 && !emittersWithSteps.includes(stepEmitter)) {
      setStepEmitter(emittersWithSteps[0]);
    }
  }, [emittersWithSteps, stepEmitter]);

  const stepSeries = useMemo(() => {
    if (!view || !stepEmitter) return [];
    const prefix = `emit/${stepEmitter}/`;
    return toSeries(
      view.labels.filter((label) => label.startsWith(prefix)),
      view,
      theme,
      (key) => key.slice(prefix.length),
    );
  }, [view, stepEmitter, theme]);

  // Keep the per-service metric picker on a metric this dataset actually has.
  useEffect(() => {
    if (!data) return;
    const options = trackableMetrics(data);
    if (options.length > 0 && !options.includes(serviceMetric)) setServiceMetric(options[0]);
  }, [data, serviceMetric]);

  // Keep the URL in step with the current view so any state can be linked to.
  const explicitSelection = selection[tab];
  useEffect(() => {
    writeParams({ tab, spec, range, dataset, compare, series: explicitSelection ?? [] });
  }, [tab, spec, range, dataset, compare, explicitSelection]);

  // Scroll position is meaningless after switching corpus.
  const previousDataset = useRef(dataset);
  useEffect(() => {
    if (previousDataset.current !== dataset) {
      previousDataset.current = dataset;
      setSelection({});
    }
  }, [dataset]);

  const header = (
    <>
      <DatasetSwitch dataset={dataset} onChange={setDataset} />
      <FilterBar
        spec={spec}
        onSpec={setSpec}
        specNames={specNames}
        specNoun={dataset === "external" ? "service" : "spec"}
        range={range}
        onRange={setRange}
        compare={compare}
        onCompare={setCompare}
        canCompare={canCompare}
        pointCount={view?.points.length ?? 0}
        generated={view?.generated ?? new Date().toISOString()}
      />
    </>
  );

  if (error) {
    return (
      <div className={styles.root}>
        {header}
        <MessageBar intent="error">
          <MessageBarBody>
            Failed to load benchmark data ({error}).{" "}
            {dataset === "external"
              ? "Azure services results appear once the benchmark has run on main."
              : "Make sure the benchmark-data branch exists and has been pushed."}
          </MessageBarBody>
          <MessageBarActions>
            <Button size="small" onClick={fetchData}>
              Retry
            </Button>
          </MessageBarActions>
        </MessageBar>
      </div>
    );
  }

  if (!view || !chartView) {
    return (
      <div className={styles.root}>
        {header}
        <LoadingState />
      </div>
    );
  }

  if (view.points.length === 0) {
    return (
      <div className={styles.root}>
        {header}
        <MessageBar intent="info">
          <MessageBarBody>No benchmark runs match the selected filters.</MessageBarBody>
        </MessageBar>
      </div>
    );
  }

  const chartTitle = comparing ? `${shortLabel(primaryKey)} across specs` : TAB_CAPTION[tab];

  return (
    <div className={mergeClasses(styles.root, loading && styles.stale)}>
      {header}
      <SummaryCards rows={summaryRows} theme={theme} />

      {dataset === "external" && data && (
        <ServiceGrid
          data={data}
          specNames={specNames}
          range={range}
          metricKey={serviceMetric}
          onMetricKey={setServiceMetric}
          theme={theme}
        />
      )}

      <ChangesPanel changes={changes} theme={theme} onSelect={focusSeries} />

      <TabList
        selectedValue={tab}
        onTabSelect={(_, tabData) => setTab(tabData.value as TabKey)}
        className={styles.tabs}
      >
        {TAB_LIST.map((entry) => (
          <Tab key={entry.key} value={entry.key}>
            {entry.label}
          </Tab>
        ))}
      </TabList>

      <section className={styles.chartSection}>
        <SectionHeader
          title={chartTitle}
          hint={
            comparing
              ? "One line per spec. Pick a different metric in the table below."
              : `Showing ${chartSeries.length} of ${rows.length}. Use the table to add or remove metrics.`
          }
        />
        <MetricChart
          points={chartView.points}
          series={chartSeries}
          theme={theme}
          beginAtZero={tab === "overview" && !comparing}
        />
        <SeriesChips series={chartSeries} onRemove={comparing ? undefined : removeSeries} />
      </section>

      <MetricTable
        rows={rows}
        selected={comparing ? [primaryKey] : selectedKeys}
        onSelectionChange={setSelectedKeys}
        singleSelect={comparing}
        theme={theme}
        showShare={rows.some((row) => row.share !== null)}
        caption={TAB_CAPTION[tab]}
      />

      {tab === "emitters" && emittersWithSteps.length > 0 && (
        <section className={styles.chartSection}>
          <SectionHeader title="Step breakdown">
            <Field label="Emitter" size="small">
              <Dropdown
                size="small"
                value={shortLabel(`emit/${stepEmitter}`)}
                selectedOptions={[stepEmitter]}
                onOptionSelect={(_, d) => d.optionValue && setStepEmitter(d.optionValue)}
              >
                {emittersWithSteps.map((name) => (
                  <Option key={name} value={name} text={shortLabel(`emit/${name}`)}>
                    {shortLabel(`emit/${name}`)}
                  </Option>
                ))}
              </Dropdown>
            </Field>
          </SectionHeader>
          <MetricChart points={view.points} series={stepSeries} theme={theme} height={280} />
          <SeriesChips series={stepSeries} />
        </section>
      )}
    </div>
  );
}

export function BenchmarkDashboard() {
  return (
    <FluentLayout>
      <Dashboard />
    </FluentLayout>
  );
}
