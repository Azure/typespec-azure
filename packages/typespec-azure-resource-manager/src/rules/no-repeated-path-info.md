ARM PUT request bodies should not repeat information already supplied in path or
query parameters. Keep resource identity in the request URI and resource-specific
data in the resource's `properties` bag, so callers do not have to supply
potentially conflicting values twice.

This rule compares authored member names in the model-valued `properties` bag
with the PUT operation's HTTP path and query parameter names. It includes
inherited members and reports on the repeated property declaration. Each matching
name is reported once per concrete PUT operation; a declaration shared by two PUT
operations can receive two diagnostics.

The check does not recurse into nested models, inspect top-level envelope
duplicates, or check PATCH bodies. Template sources are skipped, but concrete
operation aliases are checked. Provider namespace metadata is not required when
this rule is selected. The rule is available but disabled by default in the
Azure resource-manager ruleset.

`@encodedName("application/json", ...)` does not change an authored property
name for this check. A JSON alias alone cannot introduce or remove a diagnostic;
HTTP `@path` and `@query` name overrides do determine the parameter names.
The rule checks the compiler's native operation graph, not an emitted
single-version schema.

## Impact

- **Area:** API, SDK

Repeating URI information in resource properties creates redundant SDK inputs
and ambiguity when the request URI and payload disagree.

## ❌ Incorrect

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

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

@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
}
```

## ✅ Correct

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @path
  name: string;
}

model WidgetProperties {
  description?: string;
}

@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
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
and ARM guideline `RPC-Put-V1-05`. Unlike the Swagger validator, which compares
serialized JSON keys, this rule deliberately compares authored TypeSpec member
names. JSON name overrides therefore have only partial Swagger parity.
