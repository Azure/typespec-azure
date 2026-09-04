import type { Theme } from "@typespec/astro-utils/utils/theme";
import { BASELINE_DAYS, formatMs, formatPercent, type Changes } from "./data.js";
import { trendColor } from "./palette.js";
import type { MetricRow } from "./types.js";

function ChangeList({
  rows,
  emptyText,
  theme,
  onSelect,
}: {
  rows: MetricRow[];
  emptyText: string;
  theme: Theme;
  onSelect: (row: MetricRow) => void;
}) {
  if (rows.length === 0) return <p className="emptyNote">{emptyText}</p>;

  return (
    <ol className="changeList">
      {rows.map((row) => (
        <li key={row.key}>
          <button type="button" className="changeItem" onClick={() => onSelect(row)}>
            <span className="changeName" title={row.key}>
              {row.name}
            </span>
            <span className="changeValues" style={{ color: trendColor(row.delta!, theme) }}>
              {formatPercent(row.deltaRatio)}
              <span className="changeAbsolute">
                {row.delta! > 0 ? "+" : "−"}
                {formatMs(Math.abs(row.delta!))}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/**
 * Ranked movers across every metric.
 *
 * The dashboard's main question is "what got slower?", which previously
 * required reading overlapping lines. Selecting an entry jumps to it in the
 * chart.
 */
export function ChangesPanel({
  changes,
  theme,
  onSelect,
}: {
  changes: Changes;
  theme: Theme;
  onSelect: (row: MetricRow) => void;
}) {
  const { regressions, improvements } = changes;
  if (regressions.length === 0 && improvements.length === 0) {
    return (
      <section className="changesPanel">
        <h2 className="sectionTitle">What changed</h2>
        <p className="emptyNote">
          No metric moved meaningfully against its {BASELINE_DAYS}-day median.
        </p>
      </section>
    );
  }

  return (
    <section className="changesPanel">
      <h2 className="sectionTitle">
        What changed
        <span className="sectionHint">latest run vs {BASELINE_DAYS}-day median</span>
      </h2>
      <div className="changesGrid">
        <div className="changesColumn">
          <h3 className="changesHeading changesHeading--slower">Slower</h3>
          <ChangeList
            rows={regressions}
            emptyText="Nothing regressed."
            theme={theme}
            onSelect={onSelect}
          />
        </div>
        <div className="changesColumn">
          <h3 className="changesHeading changesHeading--faster">Faster</h3>
          <ChangeList
            rows={improvements}
            emptyText="Nothing improved."
            theme={theme}
            onSelect={onSelect}
          />
        </div>
      </div>
    </section>
  );
}
