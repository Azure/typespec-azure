---
validatorRuleId: PatchInOperationName
engine: spectral
coverageKind: partial
tspRuleset: resource-manager
tspLints:
  - tsp-lintdiff-local-linter/patch-in-operation-name
---

# PatchInOperationName

**Severity:** warning

**Applies to:** Both ARM and DataPlane

## Native requirement

ARM PATCH operation names should start with `update`, ignoring case. Use names
such as `update`, `updateTags`, or `updateWidget` rather than `patch` or `modify`.
The name describes the partial-update operation consistently across ARM APIs.

### Incorrect

```tsp
@armResourceOperations
interface Widgets {
  modify is ArmResourcePatchSync<Widget, Properties = WidgetProperties>;
}
```

### Correct

```tsp
@armResourceOperations
interface Widgets {
  update is ArmResourcePatchSync<Widget, Properties = WidgetProperties>;
}
```

These snippets assume an ARM service, a tracked resource named `Widget`, and its
property model `WidgetProperties`.
Renaming a shipped operation can break existing SDKs; suppress the warning when
compatibility requires retaining its name.

## Native rule contract

- **Intent:** require the authored name of each concrete ARM HTTP PATCH endpoint
  to start with `update`, case-insensitively, irrespective of its response codes.
- **Surface:** use `getAllHttpServices` and each service's resolved operations,
  rather than visiting generic declarations that are not endpoints. The sibling
  `put-in-operation-name` rule uses this same supported HTTP surface.
- **Applicability:** the local mixed ARM/data-plane runner needs a service-level
  `getArmProviderNamespace` guard. Data-plane naming remains owned by the
  official `use-standard-names` policy. In an official ARM-only ruleset,
  applicability belongs to that ruleset rather than a provider guard.
- **Diagnostics:** one warning on each offending authored operation; neither
  its interface name nor an underscore elsewhere in the name establishes
  compliance. No custom traversal or name resolver is needed.
- **Names and versions:** source operation names, not SDK overrides, emitted
  operation IDs, or historical renamed names. Removed operations still present
  in the unprojected source can be checked; corpus comparison must attribute them
  to the selected API version separately.

## Existing official coverage

`@azure-tools/typespec-azure-core/use-standard-names` checks PATCH names only
when a response includes 201, and allows `create` as well as `update`. It is
enabled in the data-plane ruleset, not the resource-manager ruleset. ARM
templates and `@armResourceUpdate` preserve the authored operation name, so
`modify is ArmResourcePatchSync<Widget, Properties = WidgetProperties>` is a supported customization that
demonstrates the uncovered ARM check. RPC009 template enforcement concerns the
HTTP verb, not the authored operation name.

## LintDiff Equivalent

- linter code: [PatchInOperationName](https://github.com/Azure/azure-openapi-validator/blob/aec54e95e52338d0afa911a92958541d5624c105/packages/rulesets/src/spectral/functions/patch-in-operation-name.ts)
- linter doc: [patch-in-operation-name.md](https://github.com/Azure/azure-openapi-validator/blob/aec54e95e52338d0afa911a92958541d5624c105/docs/patch-in-operation-name.md)

The validator checks grouped Swagger operation IDs with a case-sensitive
`Update` prefix. The native rule deliberately checks authored ARM endpoint names
instead. Ungrouped IDs, emitter overrides, SDK names, and casing differences
are not used to simulate emitted naming. See [migration.md](migration.md) for
the supported-shape matrix and real-service comparison.
