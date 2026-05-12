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
import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";

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

  const commitLabels = useMemo(() => data.entries.map((e) => e.commit.slice(0, 7)), [data]);

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
    return { labels: commitLabels, datasets };
  }, [data, metricLabels, colors, commitLabels]);

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
          type: "category",
          title: { display: true, text: "Commit" },
          ticks: {
            maxRotation: 45,
            minRotation: 45,
          },
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
