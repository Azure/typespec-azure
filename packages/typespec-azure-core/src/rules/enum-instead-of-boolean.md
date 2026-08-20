Boolean values can be hard for API users to understand when the property or payload represents a
domain state, option, or mode. Prefer a descriptive extensible enum modeled as a union so future
values can be added without a breaking change.

## Impact

- **Area:** SDK, API

Boolean shapes can make generated clients less readable and can force future breaking changes if the
API later needs more than two values.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule `EnumInsteadOfBoolean`.

#### Incorrect

```tsp
model Widget {
  enabled: boolean;
}
```

```tsp
@get
op isWidgetEnabled(): boolean;
```

#### Correct

```tsp
union WidgetState {
  Enabled: "Enabled",
  Disabled: "Disabled",
  string,
}

model Widget {
  state: WidgetState;
}
```

```tsp
@get
op getWidgetState(): WidgetState;
```

## Suppression

Suppress this rule only when the value is inherently boolean and is unlikely to grow additional
states, such as a simple yes/no capability.
