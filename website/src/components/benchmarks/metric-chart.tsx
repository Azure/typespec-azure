import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Line } from "react-chartjs-2";

import type { Theme } from "@typespec/astro-utils/utils/theme";
import { formatMs } from "./data.js";
import { chartTheme } from "./palette.js";
import type { ChartPoint, Series } from "./types.js";
import { getCommitUrl } from "./url.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/** Minimum horizontal room a dated tick needs before labels start colliding. */
const TICK_SPACING_PX = 90;

/**
 * Choose which x positions get a visible date label.
 *
 * The axis holds one position per run (hundreds of them, many on the same day),
 * so labelling every position produced a wall of repeated `MM/DD` strings.
 * Instead only the first run of a day is eligible, and those are subsampled to
 * however many fit the current width.
 */
function buildTickLabels(points: ChartPoint[], width: number): string[] {
  const labels = points.map(() => "");
  if (points.length === 0) return labels;

  const dayStarts: number[] = [];
  let previousDay = "";
  points.forEach((point, index) => {
    const day = point.timestamp.slice(0, 10);
    if (day !== previousDay) {
      dayStarts.push(index);
      previousDay = day;
    }
  });

  const maxTicks = Math.max(2, Math.floor(width / TICK_SPACING_PX));
  const step = Math.max(1, Math.ceil(dayStarts.length / maxTicks));
  const spansYears =
    points[0].timestamp.slice(0, 4) !== points[points.length - 1].timestamp.slice(0, 4);

  for (let i = 0; i < dayStarts.length; i += step) {
    const index = dayStarts[i];
    labels[index] = new Date(points[index].timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      ...(spansYears ? { year: "2-digit" } : {}),
    });
  }
  return labels;
}

/** Track the rendered width of an element, so tick density can follow it. */
function useElementWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(900);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

export function MetricChart({
  points,
  series,
  theme,
  yAxisLabel = "Time (ms)",
  beginAtZero = false,
  height = 360,
}: {
  points: ChartPoint[];
  series: Series[];
  theme: Theme;
  yAxisLabel?: string;
  /** Only meaningful when every series shares a magnitude, such as the stage totals. */
  beginAtZero?: boolean;
  height?: number;
}) {
  const colors = chartTheme(theme);
  const pointsRef = useRef(points);
  pointsRef.current = points;

  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const tickLabels = useMemo(() => buildTickLabels(points, width), [points, width]);

  const chartData = useMemo(
    () => ({
      labels: points.map((_, index) => String(index)),
      datasets: series.map((s) => ({
        label: s.label,
        data: s.data,
        borderColor: s.color,
        backgroundColor: s.color,
        borderWidth: 1.75,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHitRadius: 12,
        tension: 0.25,
        spanGaps: true,
      })),
    }),
    [points, series],
  );

  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", axis: "x", intersect: false },
      onClick: (_event, elements) => {
        const index = elements[0]?.index;
        if (index === undefined) return;
        const point = pointsRef.current[index];
        if (point) window.open(getCommitUrl(point.commit), "_blank", "noopener");
      },
      onHover: (event, elements) => {
        const target = event.native?.target as HTMLElement | undefined;
        if (target) target.style.cursor = elements.length > 0 ? "pointer" : "default";
      },
      plugins: {
        // Series are listed as interactive chips below the chart instead, which
        // wrap properly and can be removed from the selection.
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBackground,
          titleColor: colors.tooltipText,
          bodyColor: colors.tooltipText,
          footerColor: colors.mutedText,
          borderColor: colors.grid,
          borderWidth: 1,
          padding: 10,
          usePointStyle: true,
          callbacks: {
            title: (items) => {
              const point = pointsRef.current[items[0]?.dataIndex ?? -1];
              if (!point) return "";
              const date = new Date(point.timestamp).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              });
              return `${point.commit.slice(0, 7)} · ${date}`;
            },
            label: (item) => `${item.dataset.label}: ${formatMs(item.parsed.y)}`,
            footer: () => "Click to open this commit on GitHub",
          },
        },
      },
      scales: {
        x: {
          type: "category",
          grid: { display: false },
          border: { color: colors.grid },
          ticks: {
            color: colors.mutedText,
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0,
            font: { size: 11 },
            callback: (_value, index) => tickLabels[index] || "",
          },
        },
        y: {
          // Small metrics get flattened against the axis when every chart is
          // forced through zero, so only aggregates opt into it.
          beginAtZero,
          grid: { color: colors.grid },
          border: { display: false },
          title: { display: yAxisLabel !== "", text: yAxisLabel, color: colors.mutedText },
          ticks: { color: colors.mutedText, font: { size: 11 } },
        },
      },
    }),
    [colors, tickLabels, beginAtZero, yAxisLabel],
  );

  if (series.length === 0) {
    return <p className="emptyNote">Select a metric below to plot it.</p>;
  }

  return (
    <div className="chartContainer" style={{ height }} ref={containerRef}>
      <Line data={chartData} options={options} />
    </div>
  );
}

/**
 * The chart's key, rendered as HTML rather than a Chart.js legend so it wraps
 * cleanly and each entry can be removed from the selection.
 */
export function SeriesChips({
  series,
  onRemove,
}: {
  series: Series[];
  onRemove?: (key: string) => void;
}) {
  if (series.length === 0) return null;

  return (
    <ul className="seriesChips">
      {series.map((s) => (
        <li key={s.key}>
          {onRemove ? (
            <button
              type="button"
              className="seriesChip seriesChip--removable"
              onClick={() => onRemove(s.key)}
              title={`Remove ${s.label} from the chart`}
            >
              <span className="seriesChipSwatch" style={{ background: s.color }} />
              <span className="seriesChipLabel">{s.label}</span>
              <span aria-hidden className="seriesChipRemove">
                ✕
              </span>
            </button>
          ) : (
            <span className="seriesChip">
              <span className="seriesChipSwatch" style={{ background: s.color }} />
              <span className="seriesChipLabel">{s.label}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
