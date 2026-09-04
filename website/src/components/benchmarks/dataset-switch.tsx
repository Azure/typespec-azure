import type { Dataset } from "./types.js";

const DATASETS: { value: Dataset; label: string; hint: string }[] = [
  { value: "main", label: "Main baseline", hint: "In-repo specs · compiler regressions" },
  { value: "external", label: "Azure services", hint: "Real service specs · per-service trends" },
];

/**
 * Top level corpus switch.
 *
 * Rendered as a segmented control rather than a tab row so it reads as a
 * different level of navigation than the content tabs further down the page.
 */
export function DatasetSwitch({
  dataset,
  onChange,
}: {
  dataset: Dataset;
  onChange: (value: Dataset) => void;
}) {
  return (
    <div className="datasetSwitch" role="radiogroup" aria-label="Benchmark dataset">
      {DATASETS.map((entry) => {
        const active = entry.value === dataset;
        return (
          <button
            key={entry.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`datasetOption ${active ? "datasetOption--active" : ""}`}
            onClick={() => onChange(entry.value)}
          >
            <span className="datasetOptionLabel">{entry.label}</span>
            <span className="datasetOptionHint">{entry.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
