Defaults for extensible enums should be one of their declared values. Adding `string` or a numeric scalar to a union allows future values, but the default should describe a value the service already documents.

This rule checks defaults on model properties and operation parameters whose types are extensible string or numeric enums. For nested unions and included enums, defaults are checked against the flattened enum values. It compares values, not variant names.

Closed enums and closed literal unions already have their defaults checked by the TypeSpec compiler. Plain scalar properties and unions without declared enum values are not constrained by this rule. An explicitly nullable union may use `null` as its default.

## Impact

- **Area:** API, SDK

An undocumented default can leave clients unable to select or explain the service's default behavior. Add the intended default to the declared values, or choose an existing value.

## ❌ Incorrect

### Named union

```tsp
union PetKind {
  Cat: "cat",
  Dog: "dog",
  string,
}

model Pet {
  kind: PetKind = "bird";
}
```

### ARM resource property

Assume the tracked resource and its standard ARM operations are already defined; only the relevant properties are shown.

```tsp
model WidgetProperties {
  mode: "automatic" | "manual" | string = "other";
}
```

## ✅ Correct

### Named union

```tsp
union PetKind {
  Cat: "cat",
  Dog: "dog",
  string,
}

model Pet {
  kind: PetKind = PetKind.Cat;
}
```

### ARM resource property

```tsp
model WidgetProperties {
  mode: "automatic" | "manual" | string = "automatic";
}
```

## Suppression

Suppress only when an existing API intentionally uses an undeclared default that cannot be changed compatibly.

```tsp
model Pet {
  #suppress "@azure-tools/typespec-azure-core/use-known-enum-default" "Preserve the existing API default."
  kind: "cat" | "dog" | string = "bird";
}
```

## LintDiff Equivalent

This rule covers the extensible-enum authoring gap corresponding to [DefaultInEnum](https://github.com/Azure/azure-openapi-validator/blob/main/docs/default-in-enum.md). Closed-enum default membership is enforced by the compiler. Unlike the Swagger linter's enum-array check, this rule accepts a null default when the union explicitly includes null.
