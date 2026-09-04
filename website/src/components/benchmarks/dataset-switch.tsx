import {
  Caption1,
  makeStyles,
  mergeClasses,
  Text,
  ToggleButton,
  tokens,
} from "@fluentui/react-components";

import type { Dataset } from "./types.js";

const DATASETS: { value: Dataset; label: string; hint: string }[] = [
  { value: "main", label: "Main baseline", hint: "In-repo specs · compiler regressions" },
  { value: "external", label: "Azure services", hint: "Real service specs · per-service trends" },
];

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalXS,
    padding: tokens.spacingHorizontalXS,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    width: "fit-content",
    maxWidth: "100%",
  },
  option: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 0,
    height: "auto",
    paddingTop: tokens.spacingVerticalSNudge,
    paddingBottom: tokens.spacingVerticalSNudge,
  },
  checked: {
    boxShadow: tokens.shadow2,
  },
  hint: {
    color: tokens.colorNeutralForeground3,
  },
});

/**
 * Top level corpus switch.
 *
 * A segmented pair of toggle buttons rather than a tab row, so it reads as a
 * different level of navigation than the content tabs further down the page.
 */
export function DatasetSwitch({
  dataset,
  onChange,
}: {
  dataset: Dataset;
  onChange: (value: Dataset) => void;
}) {
  const styles = useStyles();

  return (
    <div className={styles.root} role="group" aria-label="Benchmark dataset">
      {DATASETS.map((entry) => {
        const active = entry.value === dataset;
        return (
          <ToggleButton
            key={entry.value}
            appearance={active ? "primary" : "subtle"}
            checked={active}
            onClick={() => onChange(entry.value)}
            className={mergeClasses(styles.option, active && styles.checked)}
          >
            <Text weight="semibold">{entry.label}</Text>
            <Caption1 className={active ? undefined : styles.hint}>{entry.hint}</Caption1>
          </ToggleButton>
        );
      })}
    </div>
  );
}
