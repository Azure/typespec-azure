import {
  CategoryScale,
  Chart as ChartJS,
  Colors,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
  type ChartOptions,
  type Plugin,
} from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";

// Minimal Chart.js date adapter using Temporal
import { _adapters } from "chart.js";

const MILLISECONDS_PER_UNIT: Record<string, number> = {
  millisecond: 1,
  second: 1000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
  month: 2_592_000_000,
  quarter: 7_776_000_000,
  year: 31_536_000_000,
};

_adapters._date.override({
  formats() {
    return {
      datetime: "yyyy-MM-dd HH:mm",
      millisecond: "HH:mm:ss.SSS",
      second: "HH:mm:ss",
      minute: "HH:mm",
      hour: "HH:mm",
      day: "MMM d",
      week: "MMM d",
      month: "MMM yyyy",
      quarter: "QQ yyyy",
      year: "yyyy",
    };
  },
  parse(value: unknown) {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return value;
    if (typeof value === "string") return new Date(value).getTime();
    if (value instanceof Date) return value.getTime();
    return null;
  },
  format(timestamp: number, fmt: string) {
    const d = new Date(timestamp);
    // Simple format substitution
    return fmt
      .replace("yyyy", String(d.getFullYear()))
      .replace("MMM", d.toLocaleString("en", { month: "short" }))
      .replace("MM", String(d.getMonth() + 1).padStart(2, "0"))
      .replace("dd", String(d.getDate()).padStart(2, "0"))
      .replace(/\bd\b/, String(d.getDate()))
      .replace("HH", String(d.getHours()).padStart(2, "0"))
      .replace("mm", String(d.getMinutes()).padStart(2, "0"))
      .replace("ss", String(d.getSeconds()).padStart(2, "0"))
      .replace("SSS", String(d.getMilliseconds()).padStart(3, "0"))
      .replace("QQ", `Q${Math.floor(d.getMonth() / 3) + 1}`);
  },
  add(timestamp: number, amount: number, unit: string) {
    return timestamp + amount * (MILLISECONDS_PER_UNIT[unit] ?? 0);
  },
  diff(a: number, b: number, unit: string) {
    return (a - b) / (MILLISECONDS_PER_UNIT[unit] ?? 1);
  },
  startOf(timestamp: number, unit: string) {
    const d = new Date(timestamp);
    if (unit === "year") return new Date(d.getFullYear(), 0, 1).getTime();
    if (unit === "quarter")
      return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).getTime();
    if (unit === "month") return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    if (unit === "week") {
      const day = d.getDay();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
    }
    if (unit === "day") return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (unit === "hour")
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime();
    if (unit === "minute")
      return new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        d.getHours(),
        d.getMinutes(),
      ).getTime();
    if (unit === "second")
      return new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        d.getHours(),
        d.getMinutes(),
        d.getSeconds(),
      ).getTime();
    return timestamp;
  },
});

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Colors,
);

interface HistoryEntry {
  commit: string;
  timestamp: string;
  metrics: Record<string, number>;
}

interface HistoryData {
  generated: string;
  labels: string[];
  entries: HistoryEntry[];
}

type MetricCategory = "linter" | "stages" | "validation" | "emit";

const HISTORY_URL =
  "https://raw.githubusercontent.com/Azure/typespec-azure/benchmark-data/results/history.json";

const CATEGORY_FILTERS: Record<MetricCategory, (label: string) => boolean> = {
  linter: (l) => l.startsWith("linter/") && l !== "linter",
  stages: (l) =>
    ["total", "loader", "resolver", "checker", "linter", "validation", "emit"].includes(l),
  validation: (l) => l.startsWith("validation/") && l !== "validation",
  emit: (l) => l.startsWith("emit/") && l !== "emit",
};

const CATEGORY_LABELS: Record<MetricCategory, string> = {
  linter: "Linting Rules",
  stages: "Compilation Stages",
  validation: "Validators",
  emit: "Emitters",
};

const ALL_CATEGORIES: MetricCategory[] = ["stages", "linter", "validation", "emit"];

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

/** Chart.js plugin: on hover, dim all datasets except the nearest one (for dense charts) */
const highlightPlugin: Plugin<"line"> = {
  id: "highlightNearest",
  beforeDraw(chart) {
    // Only activate for charts with many datasets
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

function BenchmarkChart({ data, category }: { data: HistoryData; category: MetricCategory }) {
  const filter = CATEGORY_FILTERS[category];
  const metricLabels = useMemo(() => data.labels.filter(filter).sort(), [data, filter]);
  const colors = useMemo(() => seriesColors(metricLabels.length), [metricLabels.length]);
  const isDense = metricLabels.length >= 8;

  const chartData = useMemo(() => {
    const datasets = metricLabels.map((label, i) => ({
      label: shortLabel(label),
      data: data.entries.map((e) => ({
        x: new Date(e.timestamp).getTime(),
        y: e.metrics[label] ?? null,
      })),
      borderColor: colors[i],
      backgroundColor: colors[i],
      borderWidth: 1.5,
      pointRadius: 2,
      pointHoverRadius: 5,
      tension: 0.2,
    }));
    return { datasets };
  }, [data, metricLabels, colors]);

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
          text: `${CATEGORY_LABELS[category]} (ms, averaged across specs)`,
          font: { size: 16 },
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
              return `${entry.commit.slice(0, 7)} — ${new Date(entry.timestamp).toLocaleDateString()}`;
            },
            label: (item) => `${item.dataset.label}: ${item.parsed.y?.toFixed(2)}ms`,
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "day",
            tooltipFormat: "MMM d, yyyy",
          },
          title: { display: true, text: "Date" },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "Time (ms)" },
        },
      },
    }),
    [data, category, isDense],
  );

  return (
    <div style={{ height: "500px", position: "relative" }}>
      <Line data={chartData} options={options} plugins={[highlightPlugin]} />
    </div>
  );
}

export function BenchmarkDashboard() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(HISTORY_URL)
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

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading benchmark data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "red" }}>
        <p>Failed to load benchmark data: {error}</p>
        <p style={{ fontSize: "0.9em", color: "gray" }}>
          Make sure the benchmark-data branch exists and has been pushed to the remote repository.
        </p>
      </div>
    );
  }

  if (!data || data.entries.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>No benchmark data available yet.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem 2rem 2rem" }}>
      <p style={{ color: "gray", fontSize: "0.85em", marginBottom: "1.5rem" }}>
        {data.entries.length} data points · Last updated{" "}
        {new Date(data.generated).toLocaleDateString()} · Values are averages across all benchmark
        specs
      </p>

      {ALL_CATEGORIES.map((cat) => (
        <div key={cat} style={{ marginBottom: "3rem" }}>
          <BenchmarkChart data={data} category={cat} />
        </div>
      ))}
    </div>
  );
}
