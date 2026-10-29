ARM PUT request bodies should not repeat information already supplied in path or
query parameters. Keep resource identity in the request URI and resource-specific
data in the resource's `properties` bag, so callers do not have to supply
potentially conflicting values twice.

This rule complements
[`arm-resource-duplicate-property`](./arm-resource-duplicate-property.md), which
compares properties-bag members with envelope property names on ARM resource
models, independently of operations. For example, an envelope `name` with
`@key("widgetName")` makes `properties.widgetName` a URI duplication only.
Conversely, `properties.identity` duplicates an envelope `identity` only under
the envelope rule when no URI parameter is named `identity`. Both rules can
report a member when its name matches both an envelope property and a URI parameter.

## Impact

- **Area:** API, SDK

Repeating URI information in resource properties creates redundant SDK inputs
and ambiguity when the request URI and payload disagree.

## ❌ Incorrect

The standard ARM create-or-replace operation carries `widgetName` in the URI.
With `ArmResourceCreateOrReplaceSync<Widget>`, repeating that key name in
`WidgetProperties` triggers this rule. These excerpts omit unchanged provider
and operation declarations.

```tsp
model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @path
  name: string;
}

model WidgetProperties {
  widgetName?: string;
  description?: string;
}
```

## ✅ Correct

Keep the resource key and operation template unchanged; remove only the redundant
properties-bag member.

```tsp
model WidgetProperties {
  description?: string;
}
```

## Suppression

Prefer removing the redundant properties-bag member. If a published API must
retain the duplication for compatibility and an ARM reviewer has approved the
exception, suppress the warning on that member with a specific justification:

```tsp
model WidgetProperties {
  #suppress "@azure-tools/typespec-azure-resource-manager/no-repeated-path-info" "Retained for compatibility with the approved published API."
  widgetName?: string;
}
```

## LintDiff Equivalent

This rule corresponds to
[RepeatedPathInfo](https://github.com/Azure/azure-openapi-validator/blob/main/docs/repeated-path-info.md)
and ARM guideline `RPC-Put-V1-05`. Like the Swagger validator, it compares JSON
property names, including JSON name overrides, with path and query parameter
names. It checks native TypeSpec operations rather than an emitted single-version
schema.
