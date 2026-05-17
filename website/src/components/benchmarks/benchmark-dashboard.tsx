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

const GITHUB_REPO = "Azure/typespec-azure";
const DEFAULT_DATA_BRANCH = "benchmark-data";

function getHistoryUrl(): string {
  if (typeof window === "undefined") {
    return `https://raw.githubusercontent.com/${GITHUB_REPO}/${DEFAULT_DATA_BRANCH}/results/history.json`;
  }
  const params = new URLSearchParams(window.location.search);
  const branch = params.get("branch") || DEFAULT_DATA_BRANCH;
  return `https://raw.githubusercontent.com/${GITHUB_REPO}/${branch}/results/history.json`;
}

const GITHUB_COMMIT_URL = `https://github.com/${GITHUB_REPO}/commit/`;

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
function getInitialParams(): { tab: Tab; spec: string; range: TimeRange } {
  if (typeof window === "undefined") return { tab: "stages", spec: "all", range: "all" };
  const params = new URLSearchParams(window.location.search);
  const tab = (params.get("tab") as Tab) || "stages";
  const spec = params.get("spec") || "all";
  const range = (params.get("range") as TimeRange) || "all";
  return {
    tab: TABS.some((t) => t.key === tab) ? tab : "stages",
    spec,
    range: TIME_RANGES.some((r) => r.key === range) ? range : "all",
  };
}

/** Update URL search params without page reload */
function updateUrlParams(params: Record<string, string>) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(params)) {
    if (value && value !== "all" && value !== "stages") {
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

interface ChartSection {
  title: string;
  filter: (label: string) => boolean;
}

function BenchmarkChart({ data, section }: { data: FilteredData; section: ChartSection }) {
  const metricLabels = useMemo(
    () => data.labels.filter(section.filter).sort(),
    [data, section.filter],
  );
  const colors = useMemo(() => seriesColors(metricLabels.length), [metricLabels.length]);
  const isDense = metricLabels.length >= 8;

  const xLabels = useMemo(
    () =>
      data.entries.map((e) => {
        const date = new Date(e.timestamp);
        return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;
      }),
    [data],
  );

  const chartData = useMemo(() => {
    const datasets = metricLabels.map((label, i) => ({
      label: shortLabel(label),
      data: data.entries.map((e) => e.metrics[label] ?? null),
      borderColor: colors[i],
      backgroundColor: colors[i],
      borderWidth: 1.5,
      pointRadius: 2,
      pointHoverRadius: 5,
      tension: 0.2,
    }));
    return { labels: xLabels, datasets };
  }, [data, metricLabels, colors, xLabels]);

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
          text: section.title,
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
              const entry = data.entries[items[0].dataIndex];
              const date = new Date(entry.timestamp).toLocaleDateString();
              return `${entry.commit.slice(0, 7)} — ${date}`;
            },
            label: (item) => `${item.dataset.label}: ${item.parsed.y?.toFixed(2)}ms`,
            afterTitle: (items) => {
              if (items.length === 0) return "";
              const entry = data.entries[items[0].dataIndex];
              return `${GITHUB_COMMIT_URL}${entry.commit}`;
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
    [data, section, isDense],
  );

  if (metricLabels.length === 0) return null;

  return (
    <div className="chartContainer">
      <Line data={chartData} options={options} plugins={[highlightPlugin]} />
    </div>
  );
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function BenchmarkDashboard() {
  const initialParams = useMemo(getInitialParams, []);
  const [data, setData] = useState<HistoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(initialParams.tab);
  const [selectedSpec, setSelectedSpec] = useState<string>(initialParams.spec);
  const [timeRange, setTimeRange] = useState<TimeRange>(initialParams.range);

  const historyUrl = useMemo(getHistoryUrl, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync state to URL
  useEffect(() => {
    updateUrlParams({ tab: activeTab, spec: selectedSpec, range: timeRange });
  }, [activeTab, selectedSpec, timeRange]);

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

  // Loading state
  if (loading) {
    return (
      <div className="stateContainer">
        <div className="spinner" />
        <p>Loading benchmark data...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="stateContainer">
        <p className="errorText">Failed to load benchmark data: {error}</p>
        <p className="errorHint">
          Make sure the benchmark-data branch exists and has been pushed to the remote repository.
        </p>
        <button className="retryButton" onClick={fetchData}>
          Retry
        </button>
      </div>
    );
  }

  if (!filteredData || filteredData.entries.length === 0) {
    return (
      <div className="stateContainer">
        <p>No benchmark data available for the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="benchmarkDashboard">
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
    </div>
  );
}
