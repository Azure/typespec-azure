import {
  Caption1,
  Dropdown,
  Field,
  makeStyles,
  Option,
  Switch,
  tokens,
} from "@fluentui/react-components";

import { formatDate } from "./data.js";
import type { TimeRange } from "./types.js";

export interface SelectOption {
  value: string;
  label: string;
}

const useStyles = makeStyles({
  bar: {
    position: "sticky",
    top: "var(--header-height, 0)",
    zIndex: 10,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "end",
    gap: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    "@media (max-width: 640px)": {
      position: "static",
    },
  },
  meta: {
    marginLeft: "auto",
    color: tokens.colorNeutralForeground3,
    whiteSpace: "nowrap",
    "@media (max-width: 640px)": {
      marginLeft: 0,
      width: "100%",
    },
  },
});

function Select({
  label,
  value,
  options,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <Field label={label} size="small">
      <Dropdown
        size="small"
        disabled={disabled}
        title={hint}
        value={disabled && hint ? hint : (selected?.label ?? "")}
        selectedOptions={[value]}
        onOptionSelect={(_, data) => data.optionValue && onChange(data.optionValue)}
      >
        {options.map((option) => (
          <Option key={option.value} value={option.value} text={option.label}>
            {option.label}
          </Option>
        ))}
      </Dropdown>
    </Field>
  );
}

const RANGES: SelectOption[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

/**
 * Every filter in one bar.
 *
 * The dataset used to be a tab row styled identically to the content tabs,
 * which made two unrelated levels of navigation look the same. It now has its
 * own segmented control above, so only the content tabs look like tabs.
 */
export function FilterBar({
  spec,
  onSpec,
  specNames,
  specNoun,
  range,
  onRange,
  compare,
  onCompare,
  canCompare,
  pointCount,
  generated,
}: {
  spec: string;
  onSpec: (value: string) => void;
  specNames: string[];
  /** What a "spec" is called in this dataset, e.g. `spec` or `service`. */
  specNoun: string;
  range: TimeRange;
  onRange: (value: TimeRange) => void;
  compare: boolean;
  onCompare: (value: boolean) => void;
  canCompare: boolean;
  pointCount: number;
  generated: string;
}) {
  const styles = useStyles();
  const specOptions: SelectOption[] = [
    { value: "all", label: `All ${specNoun}s (average)` },
    ...specNames.map((name) => ({ value: name, label: name })),
  ];

  return (
    <div className={styles.bar}>
      <Select
        label={specNoun === "spec" ? "Spec" : "Service"}
        value={spec}
        options={specOptions}
        onChange={onSpec}
        disabled={compare}
        hint={compare ? `Comparing all ${specNoun}s` : undefined}
      />
      <Select
        label="Range"
        value={range}
        options={RANGES}
        onChange={(value) => onRange(value as TimeRange)}
      />
      {canCompare && (
        <Switch
          checked={compare}
          onChange={(_, data) => onCompare(data.checked)}
          label={`Compare across ${specNoun}s`}
        />
      )}
      <Caption1 className={styles.meta}>
        {pointCount.toLocaleString()} runs · updated {formatDate(generated)}
      </Caption1>
    </div>
  );
}
