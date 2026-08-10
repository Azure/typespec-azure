import {
  CategoryScale,
  Chart as ChartJS,
  Colors,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type ChartOptions,
  type Plugin,
} from "chart.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";

import "./benchmark-dashboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Colors,
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  commit: string;
  timestamp: string;
  metrics: Record<string, number>;
  specMetrics?: Record<string, Record<string, number>>;
}

interface HistoryData {
  generated: string;
  labels: string[];
  specNames?: string[];
  entries: HistoryEntry[];
}

/** View of history data after applying filters (spec, time range). */
interface FilteredData {
  labels: string[];
  entries: { commit: string; timestamp: string; metrics: Record<string, number> }[];
  generated: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_GITHUB_REPO = "Azure/typespec-azure";
const DEFAULT_DATA_BRANCH = "benchmark-data";

function getUrlParams(): { repo: string; branch: string } {
  if (typeof window === "undefined") {
    return { repo: DEFAULT_GITHUB_REPO, branch: DEFAULT_DATA_BRANCH };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    repo: params.get("repo") || DEFAULT_GITHUB_REPO,
    branch: params.get("branch") || DEFAULT_DATA_BRANCH,
  };
}

type Dataset = "main" | "external";

function getHistoryUrl(dataset: Dataset): string {
  const { repo, branch } = getUrlParams();
  const dir = dataset === "external" ? "external-results" : "results";
  return `https://raw.githubusercontent.com/${repo}/${branch}/${dir}/history.json`;
}

function getCommitUrl(): string {
  const { repo } = getUrlParams();
  return `https://github.com/${repo}/commit/`;
}

type Tab = "stages" | "linter" | "validation" | "emitters";
type TimeRange = "30d" | "90d" | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "stages", label: "Compilation Stages" },
  { key: "linter", label: "Linting Rules" },
  { key: "validation", label: "Validators" },
  { key: "emitters", label: "Emitters" },
];

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "all", label: "All time" },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Strip common prefixes for shorter legend labels */
function shortLabel(label: string): string {
  return label
    .replace(/^linter\//, "")
    .replace(/^validation\//, "")
    .replace(/^emit\//, "")
    .replace(/@azure-tools\/typespec-azure-core\//, "azure-core/")
    .replace(/@azure-tools\/typespec-azure-resource-manager\//, "arm/")
    .replace(/@azure-tools\/typespec-autorest/, "autorest")
    .replace(/@typespec\/openapi3/, "openapi3")
    .replace(/@typespec\//, "");
}

/** Generate distinct colors for N series using HSL */
function seriesColors(count: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const hue = (i * 360) / count;
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }
  return colors;
}

/** Parse URL search params to get initial state */
function getInitialParams(): { tab: Tab; spec: string; range: TimeRange; dataset: Dataset } {
  if (typeof window === "undefined")
    return { tab: "stages", spec: "all", range: "all", dataset: "main" };
  const params = new URLSearchParams(window.location.search);
  const tab = (params.get("tab") as Tab) || "stages";
  const spec = params.get("spec") || "all";
  const range = (params.get("range") as TimeRange) || "all";
  const dataset = (params.get("dataset") as Dataset) || "main";
  return {
    tab: TABS.some((t) => t.key === tab) ? tab : "stages",
    spec,
    range: TIME_RANGES.some((r) => r.key === range) ? range : "all",
    dataset: dataset === "external" ? "external" : "main",
  };
}

/** Update URL search params without page reload */
function updateUrlParams(params: Record<string, string>) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(params)) {
    if (value && value !== "all" && value !== "stages" && value !== "main") {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
  }
  window.history.replaceState(null, "", url.toString());
}

// ─── Chart.js Plugin ──────────────────────────────────────────────────────────

/** On hover, dim all datasets except the nearest one (for dense charts) */
const highlightPlugin: Plugin<"line"> = {
  id: "highlightNearest",
  beforeDraw(chart) {
    if (chart.data.datasets.length < 8) return;

    const active = chart.getActiveElements();
    if (active.length === 0) {
      for (const ds of chart.data.datasets) {
        (ds as any).borderColor = (ds as any)._originalColor ?? (ds as any).borderColor;
        (ds as any).borderWidth = 1.5;
        (ds as any).pointRadius = 2;
      }
      return;
    }
    const hoveredIndex = active[0].datasetIndex;
    for (let i = 0; i < chart.data.datasets.length; i++) {
      const ds = chart.data.datasets[i] as any;
      if (!ds._originalColor) ds._originalColor = ds.borderColor;
      if (i === hoveredIndex) {
        ds.borderColor = ds._originalColor;
        ds.borderWidth = 3;
        ds.pointRadius = 4;
      } else {
        const orig: string = ds._originalColor;
        ds.borderColor = orig.replace(/hsl\((\d+),\s*70%,\s*50%\)/, "hsla($1, 30%, 75%, 0.3)");
        ds.borderWidth = 1;
        ds.pointRadius = 0;
      }
    }
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface Series {
  label: string;
  data: (number | null)[];
}

/** A point on the x axis: the commit + timestamp behind each entry. */
interface ChartPoint {
  commit: string;
  timestamp: string;
}

/** Render a time-series line chart from pre-built series. */
function MultiSeriesChart({
  title,
  points,
  series,
}: {
  title: string;
  points: ChartPoint[];
  series: Series[];
}) {
  const colors = useMemo(() => seriesColors(series.length), [series.length]);
  const isDense = series.length >= 8;

  const xLabels = useMemo(
    () =>
      points.map((p) => {
        const date = new Date(p.timestamp);
        return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;
      }),
    [points],
  );

  const chartData = useMemo(() => {
    const datasets = series.map((s, i) => ({
      label: s.label,
      data: s.data,
      borderColor: colors[i],
      backgroundColor: colors[i],
      borderWidth: 1.5,
      pointRadius: 2,
      pointHoverRadius: 5,
      tension: 0.2,
    }));
    return { labels: xLabels, datasets };
  }, [series, colors, xLabels]);

  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: isDense
        ? { mode: "nearest", intersect: false }
        : { mode: "nearest", axis: "x", intersect: false },
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 16 },
          color: "currentcolor",
        },
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: { size: 11 },
          },
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              if (items.length === 0) return "";
              const point = points[items[0].dataIndex];
              const date = new Date(point.timestamp).toLocaleDateString();
              return `${point.commit.slice(0, 7)} — ${date}`;
            },
            label: (item) => `${item.dataset.label}: ${item.parsed.y?.toFixed(2)}ms`,
            afterTitle: (items) => {
              if (items.length === 0) return "";
              const point = points[items[0].dataIndex];
              return `${getCommitUrl()}${point.commit}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "category",
          title: { display: true, text: "Date" },
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: 30,
          },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "Time (ms)" },
        },
      },
    }),
    [title, points, isDense],
  );

  if (series.length === 0) return null;

  return (
    <div className="chartContainer">
      <Line data={chartData} options={options} plugins={[highlightPlugin]} />
    </div>
  );
}

interface ChartSection {
  title: string;
  filter: (label: string) => boolean;
}

function BenchmarkChart({ data, section }: { data: FilteredData; section: ChartSection }) {
  const metricLabels = useMemo(
    () => data.labels.filter(section.filter).sort(),
    [data, section.filter],
  );

  const points = useMemo<ChartPoint[]>(
    () => data.entries.map((e) => ({ commit: e.commit, timestamp: e.timestamp })),
    [data],
  );

  const series = useMemo<Series[]>(
    () =>
      metricLabels.map((label) => ({
        label: shortLabel(label),
        data: data.entries.map((e) => e.metrics[label] ?? null),
      })),
    [data, metricLabels],
  );

  if (metricLabels.length === 0) return null;

  return <MultiSeriesChart title={section.title} points={points} series={series} />;
}

function MetricSummary({ data }: { data: FilteredData }) {
  const latest = data.entries[data.entries.length - 1];
  const previous = data.entries.length > 1 ? data.entries[data.entries.length - 2] : null;

  if (!latest) return null;

  const stageMetrics = ["total", "loader", "resolver", "checker", "linter", "validation"];

  return (
    <div className="summaryGrid">
      {stageMetrics.map((metric) => {
        const value = latest.metrics[metric];
        if (value === undefined) return null;
        const prev = previous?.metrics[metric];
        const change = prev !== undefined ? ((value - prev) / prev) * 100 : null;

        let changeClass = "summaryCardChange summaryCardChange--neutral";
        if (change !== null && Math.abs(change) >= 2) {
          changeClass = `summaryCardChange ${change > 0 ? "summaryCardChange--positive" : "summaryCardChange--negative"}`;
        }

        return (
          <div key={metric} className="summaryCard">
            <div className="summaryCardLabel">{metric}</div>
            <div className="summaryCardValue">{value.toFixed(1)}ms</div>
            {change !== null && (
              <div className={changeClass}>
                {change > 0 ? "+" : ""}
                {change.toFixed(1)}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Discover emitter names from labels (format: emit/<emitter-name>) */
function getEmitterNames(labels: string[]): string[] {
  const names = new Set<string>();
  for (const label of labels) {
    if (!label.startsWith("emit/")) continue;
    const parts = label.slice("emit/".length).split("/");
    if (parts[0].startsWith("@") && parts.length >= 2) {
      names.add(`${parts[0]}/${parts[1]}`);
    } else if (parts.length >= 1) {
      names.add(parts[0]);
    }
  }
  return [...names].sort();
}

function emitterHasSteps(labels: string[], emitterName: string): boolean {
  const prefix = `emit/${emitterName}/`;
  return labels.some((l) => l.startsWith(prefix));
}

function EmitterSection({ data, emitterName }: { data: FilteredData; emitterName: string }) {
  const [expanded, setExpanded] = useState(false);
  const hasSteps = useMemo(() => emitterHasSteps(data.labels, emitterName), [data, emitterName]);

  const displayName = shortLabel(`emit/${emitterName}`);

  return (
    <div className="emitterSection">
      <div className={`emitterHeader ${expanded ? "emitterHeader--expanded" : ""}`}>
        <h4 className="emitterTitle">{displayName}</h4>
        {hasSteps && (
          <button className="emitterToggle" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Hide Steps" : "Show Steps"}
          </button>
        )}
      </div>

      <BenchmarkChart
        data={data}
        section={{
          title: `${displayName} — Total (ms)`,
          filter: (l) => l === `emit/${emitterName}`,
        }}
      />

      {expanded && hasSteps && (
        <div className="emitterSteps">
          <BenchmarkChart
            data={data}
            section={{
              title: `${displayName} — Steps Breakdown (ms)`,
              filter: (l) => l.startsWith(`emit/${emitterName}/`),
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Azure services view ──────────────────────────────────────────────────────

type ExternalMode = "by-spec" | "by-emitter";

/** Compilation stages shown per spec (in logical order). */
const STAGE_LABELS = ["loader", "resolver", "checker", "validation", "linter"];

/** Collect the union of metric labels seen across all specs' specMetrics. */
function collectSpecMetricLabels(entries: HistoryEntry[]): string[] {
  const labels = new Set<string>();
  for (const entry of entries) {
    for (const metrics of Object.values(entry.specMetrics ?? {})) {
      for (const label of Object.keys(metrics)) labels.add(label);
    }
  }
  return [...labels];
}

/**
 * Azure services view: a single chart whose comparison axis is switchable.
 * - by-spec:   fix one spec, one line per stage and per emitter.
 * - by-emitter: fix one emitter, one line per spec.
 */
function ExternalView({
  data,
  timeRange,
  onTimeRange,
}: {
  data: HistoryData;
  timeRange: TimeRange;
  onTimeRange: (r: TimeRange) => void;
}) {
  const [mode, setMode] = useState<ExternalMode>("by-emitter");
  const [selectedSpec, setSelectedSpec] = useState<string>("");
  const [selectedEmitter, setSelectedEmitter] = useState<string>("");

  const entries = useMemo(() => {
    if (timeRange === "all") return data.entries;
    const days = timeRange === "30d" ? 30 : 90;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return data.entries.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
  }, [data, timeRange]);

  const specNames = useMemo(() => {
    if (data.specNames && data.specNames.length > 0) return data.specNames;
    const names = new Set<string>();
    for (const e of entries) for (const n of Object.keys(e.specMetrics ?? {})) names.add(n);
    return [...names].sort();
  }, [data, entries]);

  const emitterNames = useMemo(() => getEmitterNames(collectSpecMetricLabels(entries)), [entries]);

  // Default selections once data is available.
  useEffect(() => {
    if (!selectedSpec && specNames.length > 0) setSelectedSpec(specNames[0]);
  }, [specNames, selectedSpec]);
  useEffect(() => {
    if (!selectedEmitter && emitterNames.length > 0) setSelectedEmitter(emitterNames[0]);
  }, [emitterNames, selectedEmitter]);

  const points = useMemo<ChartPoint[]>(
    () => entries.map((e) => ({ commit: e.commit, timestamp: e.timestamp })),
    [entries],
  );

  const series = useMemo<Series[]>(() => {
    if (mode === "by-spec") {
      if (!selectedSpec) return [];
      // Show the per-stage breakdown plus one line per emitter for this spec.
      const stageSeries: Series[] = STAGE_LABELS.map((label) => ({
        label,
        data: entries.map((e) => e.specMetrics?.[selectedSpec]?.[label] ?? null),
      }));
      const emitterSeries: Series[] = emitterNames.map((emitter) => ({
        label: shortLabel(`emit/${emitter}`),
        data: entries.map((e) => e.specMetrics?.[selectedSpec]?.[`emit/${emitter}`] ?? null),
      }));
      return [...stageSeries, ...emitterSeries];
    }
    if (!selectedEmitter) return [];
    return specNames.map((spec) => ({
      label: spec,
      data: entries.map((e) => e.specMetrics?.[spec]?.[`emit/${selectedEmitter}`] ?? null),
    }));
  }, [mode, selectedSpec, selectedEmitter, emitterNames, specNames, entries]);

  const title =
    mode === "by-spec"
      ? `${selectedSpec} — stages & emitters (ms)`
      : `${shortLabel(`emit/${selectedEmitter}`)} — specs (ms)`;

  if (entries.length === 0) {
    return (
      <p className="meta">No Azure services benchmark data available for the selected filters.</p>
    );
  }

  return (
    <div>
      <div className="controls">
        <div className="tabBar" style={{ marginBottom: 0 }}>
          <button
            onClick={() => setMode("by-emitter")}
            className={`tab ${mode === "by-emitter" ? "tab--active" : ""}`}
          >
            By emitter
          </button>
          <button
            onClick={() => setMode("by-spec")}
            className={`tab ${mode === "by-spec" ? "tab--active" : ""}`}
          >
            By spec
          </button>
        </div>

        {mode === "by-spec" ? (
          <div className="controlGroup">
            <span className="controlLabel">Spec:</span>
            <select
              className="select"
              value={selectedSpec}
              onChange={(e) => setSelectedSpec(e.target.value)}
            >
              {specNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="controlGroup">
            <span className="controlLabel">Emitter:</span>
            <select
              className="select"
              value={selectedEmitter}
              onChange={(e) => setSelectedEmitter(e.target.value)}
            >
              {emitterNames.map((name) => (
                <option key={name} value={name}>
                  {shortLabel(`emit/${name}`)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="controlGroup">
          <span className="controlLabel">Range:</span>
          <select
            className="select"
            value={timeRange}
            onChange={(e) => onTimeRange(e.target.value as TimeRange)}
          >
            {TIME_RANGES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <span className="meta" style={{ marginLeft: "auto" }}>
          {entries.length} data points · Updated {new Date(data.generated).toLocaleDateString()}
        </span>
      </div>

      <MultiSeriesChart title={title} points={points} series={series} />
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function BenchmarkDashboard() {
  const initialParams = useMemo(getInitialParams, []);
  const [data, setData] = useState<HistoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(initialParams.tab);
  const [selectedSpec, setSelectedSpec] = useState<string>(initialParams.spec);
  const [timeRange, setTimeRange] = useState<TimeRange>(initialParams.range);
  const [dataset, setDataset] = useState<Dataset>(initialParams.dataset);

  const historyUrl = useMemo(() => getHistoryUrl(dataset), [dataset]);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    setData(null);
    fetch(historyUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d: HistoryData) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [historyUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync state to URL
  useEffect(() => {
    updateUrlParams({ tab: activeTab, spec: selectedSpec, range: timeRange, dataset });
  }, [activeTab, selectedSpec, timeRange, dataset]);

  // Derive filtered data
  const filteredData: FilteredData | null = useMemo(() => {
    if (!data) return null;

    let entries = data.entries;

    // Apply time range filter
    if (timeRange !== "all") {
      const days = timeRange === "30d" ? 30 : 90;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      entries = entries.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
    }

    // Apply spec filter
    if (selectedSpec !== "all") {
      entries = entries.map((e) => ({
        commit: e.commit,
        timestamp: e.timestamp,
        metrics: e.specMetrics?.[selectedSpec] ?? e.metrics,
      }));
    }

    // Derive labels from filtered entries
    const allLabels = new Set<string>();
    for (const entry of entries) {
      for (const label of Object.keys(entry.metrics)) {
        allLabels.add(label);
      }
    }

    return {
      generated: data.generated,
      labels: [...allLabels].sort(),
      entries,
    };
  }, [data, selectedSpec, timeRange]);

  const specNames = useMemo(() => data?.specNames ?? [], [data]);
  const emitterNames = useMemo(
    () => (filteredData ? getEmitterNames(filteredData.labels) : []),
    [filteredData],
  );

  const datasetSwitch = (
    <div className="tabBar">
      <button
        onClick={() => setDataset("main")}
        className={`tab ${dataset === "main" ? "tab--active" : ""}`}
      >
        Main baseline
      </button>
      <button
        onClick={() => setDataset("external")}
        className={`tab ${dataset === "external" ? "tab--active" : ""}`}
      >
        Azure services
      </button>
    </div>
  );

  let body: React.ReactNode;
  if (loading) {
    body = (
      <div className="stateContainer">
        <div className="spinner" />
        <p>Loading benchmark data...</p>
      </div>
    );
  } else if (error) {
    body = (
      <div className="stateContainer">
        <p className="errorText">Failed to load benchmark data: {error}</p>
        <p className="errorHint">
          {dataset === "external"
            ? "Azure services results appear once the benchmark has run on main (external-results/history.json)."
            : "Make sure the benchmark-data branch exists and has been pushed to the remote repository."}
        </p>
        <button className="retryButton" onClick={fetchData}>
          Retry
        </button>
      </div>
    );
  } else if (dataset === "external") {
    body = data ? (
      <ExternalView data={data} timeRange={timeRange} onTimeRange={setTimeRange} />
    ) : (
      <div className="stateContainer">
        <p>No Azure services benchmark data available.</p>
      </div>
    );
  } else if (!filteredData || filteredData.entries.length === 0) {
    body = (
      <div className="stateContainer">
        <p>No benchmark data available for the selected filters.</p>
      </div>
    );
  } else {
    body = (
      <>
        {/* Controls: spec selector + time range */}
        <div className="controls">
          {specNames.length > 0 && (
            <div className="controlGroup">
              <span className="controlLabel">Spec:</span>
              <select
                className="select"
                value={selectedSpec}
                onChange={(e) => setSelectedSpec(e.target.value)}
              >
                <option value="all">All (average)</option>
                {specNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="controlGroup">
            <span className="controlLabel">Range:</span>
            <select
              className="select"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            >
              {TIME_RANGES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <span className="meta" style={{ marginLeft: "auto" }}>
            {filteredData.entries.length} data points · Updated{" "}
            {new Date(filteredData.generated).toLocaleDateString()}
          </span>
        </div>

        <MetricSummary data={filteredData} />

        {/* Tab navigation */}
        <div className="tabBar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`tab ${activeTab === tab.key ? "tab--active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "stages" && (
          <BenchmarkChart
            data={filteredData}
            section={{
              title: "Compilation Stages (ms)",
              filter: (l) =>
                ["total", "loader", "resolver", "checker", "linter", "validation"].includes(l),
            }}
          />
        )}

        {activeTab === "linter" && (
          <BenchmarkChart
            data={filteredData}
            section={{
              title: "Linting Rules (ms)",
              filter: (l) => l.startsWith("linter/") && l !== "linter",
            }}
          />
        )}

        {activeTab === "validation" && (
          <BenchmarkChart
            data={filteredData}
            section={{
              title: "Validators (ms)",
              filter: (l) => l.startsWith("validation/") && l !== "validation",
            }}
          />
        )}

        {activeTab === "emitters" && (
          <div>
            {emitterNames.length === 0 ? (
              <p className="meta">No emitter data available.</p>
            ) : (
              emitterNames.map((name) => (
                <EmitterSection key={name} data={filteredData} emitterName={name} />
              ))
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="benchmarkDashboard">
      {datasetSwitch}
      {body}
    </div>
  );
}
