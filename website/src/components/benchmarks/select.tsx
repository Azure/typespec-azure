import { Dropdown, Field, Option } from "@fluentui/react-components";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * A labelled dropdown.
 *
 * Every picker on the dashboard needs the same `Field` + `Dropdown` + `Option`
 * assembly, so it lives here rather than being rebuilt at each call site.
 */
export function Select({
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
  /** Shown in place of the value when the control is disabled. */
  hint?: string;
}) {
  const selected = options.find((option) => option.value === value);
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
