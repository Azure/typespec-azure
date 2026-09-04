/**
 * Series colors for the benchmark charts.
 *
 * The old dashboard generated `hsl(i * 360 / n, 70%, 50%)` for up to 88 series,
 * which produced hues far too close together to tell apart and ignored the site
 * theme. Charts now draw a bounded number of series from a curated palette that
 * stays legible on both light and dark backgrounds.
 */

import { webDarkTheme, webLightTheme } from "@fluentui/react-components";
import type { Theme } from "@typespec/astro-utils/utils/theme";

/** The Fluent theme backing the current site theme. */
function fluentTheme(theme: Theme) {
  return theme === "dark" ? webDarkTheme : webLightTheme;
}

interface PaletteEntry {
  light: string;
  dark: string;
}

/**
 * Ten hues chosen to stay distinguishable for the most common forms of color
 * vision deficiency, each with a variant tuned for the surface it sits on.
 *
 * Fluent's `colorPalette*Foreground1` ramp is not used here: it only offers
 * seven hues, two of which are greens, and it signals status rather than
 * telling categories apart.
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

/**
 * Chart chrome resolved from the Fluent theme.
 *
 * Chart.js paints to a canvas and cannot read the CSS custom properties that
 * `FluentProvider` emits, so token values are read off the theme object rather
 * than being restated as literals here.
 */
export function chartTheme(theme: Theme): ChartTheme {
  const fluent = fluentTheme(theme);
  return {
    text: fluent.colorNeutralForeground1,
    mutedText: fluent.colorNeutralForeground3,
    grid: fluent.colorNeutralStroke2,
    tooltipBackground: fluent.colorNeutralBackground1,
    tooltipText: fluent.colorNeutralForeground1,
  };
}

/** Color used to signal a metric got slower / faster. */
export function trendColor(delta: number, theme: Theme): string {
  const fluent = fluentTheme(theme);
  return delta > 0 ? fluent.colorPaletteRedForeground1 : fluent.colorPaletteGreenForeground1;
}
