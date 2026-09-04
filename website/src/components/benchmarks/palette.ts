/**
 * Series colors for the benchmark charts.
 *
 * The old dashboard generated `hsl(i * 360 / n, 70%, 50%)` for up to 88 series,
 * which produced hues far too close together to tell apart and ignored the site
 * theme. Charts now draw a bounded number of series from a curated palette that
 * stays legible on both light and dark backgrounds.
 */

import type { Theme } from "@typespec/astro-utils/utils/theme";

interface PaletteEntry {
  light: string;
  dark: string;
}

/**
 * Ten hues chosen to stay distinguishable for the most common forms of color
 * vision deficiency, each with a variant tuned for the surface it sits on.
 */
const PALETTE: PaletteEntry[] = [
  { light: "#0f6cbd", dark: "#62abf5" }, // blue
  { light: "#d67e00", dark: "#f5a35c" }, // orange
  { light: "#0e7c42", dark: "#5ec98a" }, // green
  { light: "#c4314b", dark: "#f87f8f" }, // red
  { light: "#7719aa", dark: "#c39bec" }, // purple
  { light: "#00778a", dark: "#58cfd9" }, // teal
  { light: "#b4009e", dark: "#ee79d9" }, // magenta
  { light: "#6f7d00", dark: "#c2cc4a" }, // olive
  { light: "#8e562e", dark: "#d7a08a" }, // brown
  { light: "#5b5fc7", dark: "#a6a7f5" }, // indigo
];

/** Resolve the color for the nth series in the current theme. */
export function seriesColor(index: number, theme: Theme): string {
  const entry = PALETTE[index % PALETTE.length];
  return theme === "dark" ? entry.dark : entry.light;
}

/** The number of distinct colors before the palette repeats. */
export const PALETTE_SIZE = PALETTE.length;

/** Chart chrome colors, so axes and grid lines follow the site theme. */
export interface ChartTheme {
  text: string;
  mutedText: string;
  grid: string;
  tooltipBackground: string;
  tooltipText: string;
}

export function chartTheme(theme: Theme): ChartTheme {
  return theme === "dark"
    ? {
        text: "#e6e6e6",
        mutedText: "#a6a6a6",
        grid: "rgba(255, 255, 255, 0.09)",
        tooltipBackground: "#292929",
        tooltipText: "#f5f5f5",
      }
    : {
        text: "#242424",
        mutedText: "#616161",
        grid: "rgba(0, 0, 0, 0.08)",
        tooltipBackground: "#ffffff",
        tooltipText: "#242424",
      };
}

/** Color used to signal a metric got slower / faster. */
export function trendColor(delta: number, theme: Theme): string {
  if (delta > 0) return theme === "dark" ? "#f87f8f" : "#c4314b";
  return theme === "dark" ? "#5ec98a" : "#0e7c42";
}
