Remove explicit `@clientName` overrides that do not change SDK naming. This rule checks model properties and operation parameters for ARM and data-plane services.

An override is redundant only when removing that application leaves both the SDK name and exact-name policy unchanged in every affected language scope. The comparison uses the normal common-name, language-specific-name, and `@friendlyName` fallback behavior. A serialized wire name set with `@encodedName` or an HTTP parameter decorator does not independently justify an SDK-name override.

The comparison also checks uses of the property as a `@friendlyName` format source under TCGC's default SDK naming policy. An override can change a dependent SDK name even when the property's own SDK name stays the same. SDK contexts that set `use-client-name-for-friendly-name-source` to `false` do not substitute source overrides in these templates.

Real renames and case-only renames remain valid. A scoped override can meaningfully restore a source name when a different common override applies. Likewise, `@clientName(exact("displayName"))` can be meaningful even when the spelling already matches: it asks language emitters not to change the name's casing.

## ❌ Incorrect

Given a `Widget` ARM resource backed by `WidgetProperties`, `displayName` already has the requested SDK name:

```tsp
model WidgetProperties {
  @clientName("displayName")
  displayName?: string;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
}
```

## ✅ Correct

Remove the override. Keep the same property and standard resource operation:

```tsp
model WidgetProperties {
  displayName?: string;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
}
```

For an operation parameter, omit `@clientName("filter")` when the parameter is already named `filter` and the override has no scoped naming effect.

Each warning targets an authored decorator application. Copies produced by property spread or template instantiation share one warning. A template-authored override is retained if it changes naming in any evaluated instance. Independently authored redundant overrides have separate warnings.

## LintDiff Equivalent

This rule addresses the native SDK naming intent of the combined [`XmsClientName`](https://github.com/Azure/azure-openapi-validator/blob/405e6f094fa8280e05af23327845f6202a8edc65/packages/rulesets/src/spectral/functions/Extensions/xms-client-name.ts) validator. That validator reports an error for a resolved parameter or property whose `x-ms-client-name` exactly matches its name under `paths` or `x-ms-paths`. It is not limited to RPaaS.

The native rule reports warnings for explicit `@clientName` applications on model properties and operation parameters. It compares effective SDK naming rather than extension text, preserves exact-name policy and scoped resets, and uses authored applications as its diagnostic unit. These are intentional semantic and multiplicity differences, not a claim of diagnostic-count equivalence. The separate `XmsClientNameParameter` and `XmsClientNameProperty` warning registrations are not migration members.
