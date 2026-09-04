import type { Dataset, Tab, TimeRange } from "./types.js";

const DEFAULT_GITHUB_REPO = "Azure/typespec-azure";
const DEFAULT_DATA_BRANCH = "benchmark-data";

const TABS: Tab[] = ["overview", "linter", "validation", "emitters"];
const RANGES: TimeRange[] = ["30d", "90d", "all"];

function searchParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

/** Repo and branch the data is read from, overridable for forks and testing. */
export function getSource(): { repo: string; branch: string } {
  const params = searchParams();
  return {
    repo: params.get("repo") || DEFAULT_GITHUB_REPO,
    branch: params.get("branch") || DEFAULT_DATA_BRANCH,
  };
}

export function getHistoryUrl(dataset: Dataset): string {
  const { repo, branch } = getSource();
  const dir = dataset === "external" ? "external-results" : "results";
  return `https://raw.githubusercontent.com/${repo}/${branch}/${dir}/history.json`;
}

export function getCommitUrl(commit: string): string {
  return `https://github.com/${getSource().repo}/commit/${commit}`;
}

export interface DashboardParams {
  tab: Tab;
  spec: string;
  range: TimeRange;
  dataset: Dataset;
  /** Metric keys explicitly pinned to the chart, empty means "use the defaults". */
  series: string[];
  /** Whether the current tab compares one metric across specs. */
  compare: boolean;
}

const DEFAULTS: DashboardParams = {
  tab: "overview",
  spec: "all",
  range: "all",
  dataset: "main",
  series: [],
  compare: false,
};

/** Read dashboard state from the URL, falling back to defaults. */
export function readParams(): DashboardParams {
  if (typeof window === "undefined") return { ...DEFAULTS };
  const params = searchParams();

  // `stages` was the previous name for the overview tab; keep old links working.
  const rawTab = params.get("tab");
  const tab = rawTab === "stages" ? "overview" : (rawTab as Tab);
  const range = params.get("range") as TimeRange;
  const dataset = params.get("dataset");
  const series = params.get("series");

  return {
    tab: TABS.includes(tab) ? tab : DEFAULTS.tab,
    spec: params.get("spec") || DEFAULTS.spec,
    range: RANGES.includes(range) ? range : DEFAULTS.range,
    dataset: dataset === "external" ? "external" : "main",
    series: series ? series.split(",").filter(Boolean) : [],
    compare: params.get("compare") === "1",
  };
}

/** Mirror dashboard state into the URL so any view can be shared as a link. */
export function writeParams(state: DashboardParams): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);

  const set = (key: string, value: string, fallback: string) => {
    if (value && value !== fallback) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
  };

  set("tab", state.tab, DEFAULTS.tab);
  set("spec", state.spec, DEFAULTS.spec);
  set("range", state.range, DEFAULTS.range);
  set("dataset", state.dataset, DEFAULTS.dataset);
  set("series", state.series.join(","), "");
  set("compare", state.compare ? "1" : "", "");

  window.history.replaceState(null, "", url.toString());
}
