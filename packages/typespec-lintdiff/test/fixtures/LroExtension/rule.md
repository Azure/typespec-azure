---
validatorRuleId: LroExtension
engine: spectral
coverageKind: partial
tspLints:
  - tsp-lintdiff-local-linter/lro-extension
tspTemplateLints:
  - "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes"
  - "@azure-tools/typespec-azure-resource-manager/arm-put-operation-response-codes"
  - "@azure-tools/typespec-azure-resource-manager/arm-delete-operation-response-codes"
tspRuleset: resource-manager
---

# LroExtension

**Severity:** error

**Applies to:** Both ARM and DataPlane

**Rule engine:** Spectral

## Description

ARM PATCH and provider/collection POST operations returning `202` must have native
long-running-operation metadata. A plain HTTP `Location` header is not sufficient:
the operation must describe how clients poll and obtain its final result.

Use the standard asynchronous ARM templates without replacing their semantic LRO
headers. When customizing `LroHeaders`, retain `ArmLroLocationHeader` (or other
supported Azure Core polling metadata) rather than just a string-valued header.

### Incorrect customization

Given a tracked resource `Widget`, this supported customization removes its
polling semantics even though it still returns `202` and a `Location` header:

```tsp
model PlainLocationHeaders {
  ...Azure.Core.Foundations.RetryAfterHeader;
  @header("Location") location?: string;
}

@armResourceOperations
interface Widgets {
  update is ArmCustomPatchAsync<Widget, Widget, LroHeaders = PlainLocationHeaders>;
}
```

### Correct customization

```tsp
@armResourceOperations
interface Widgets {
  update is ArmCustomPatchAsync<
    Widget,
    Widget,
    LroHeaders = ArmLroLocationHeader<FinalResult = Widget> &
      Azure.Core.Foundations.RetryAfterHeader
  >;
}
```

The same requirement applies to customized `ArmProviderActionSync` responses and
`ArmProviderActionAsync` headers. The default `ArmProviderActionAsync` template
already provides the necessary semantics.

## Native rule contract

- **Semantic layer:** compiler service discovery, HTTP service operations and
  exact response status `202`, ARM `isArmCollectionAction`, and Azure Core
  `getLroMetadata`. No emitter, OpenAPI-extension, SDK, or reference-string logic.
- **Population:** PATCH operations and POST operations marked as ARM collection
  actions, including provider-scoped actions. Resource-instance POST, PUT, and
  DELETE are intentionally left to the existing official ARM status-code rules;
  this rule does not duplicate their checks.
- **Diagnostic unit/target:** one warning on the authored operation, regardless
  of how many response alternatives contain `202` or how many parent/child
  service traversals include it. Deduplication uses semantic operation identity,
  not shared response types, so distinct operations remain distinct targets.
  Eligible operations are marked visited before resolving polling metadata,
  including compliant operations, so overlapping traversals do not repeat
  diagnostics emitted by Azure Core metadata resolution.
  Template declarations are not independently diagnosed.
- **Exemptions:** operations without exact `202`, other verbs, resource-instance
  POST, and operations with native LRO metadata.
- **Applicability infrastructure:** lintdiff enables mixed ARM/data-plane rules,
  so service-root `getArmProviderNamespace` isolates ARM services before HTTP
  traversal. This follows the sibling `lro-error-content` service traversal,
  not its unrelated error-reference logic. Unlike `resolveProviderNamespace`
  on an operation namespace, it also reaches nested namespaces. On promotion
  to the ARM-only official library, remove this lintdiff-only service guard;
  the selected official ARM ruleset provides the audience boundary.
- **Versioning:** examine the semantic operations in the compiler program, not
  emitted version snapshots. Corpus comparison separately attributes diagnostics
  to the dataset-selected API version.

## Supported-shape and parity matrix

The maintained `@azure-tools/typespec-azure-rulesets/resource-manager` ruleset,
without Core/all or ARM/all over-enablement, accepts all seven template cases
below with zero diagnostics. Plain `Location` cases have no native LRO metadata;
the semantic-header controls do. Provider actions are outside `getArmResources`
and consequently outside the existing registered-resource POST response check.

| Authored shape                                                       | Native metadata | Emitted LRO extension / validator | Native result |
| -------------------------------------------------------------------- | --------------- | --------------------------------- | ------------- |
| Default `ArmResourcePatchAsync`                                      | Present         | `true` / compliant                | Compliant     |
| `ArmCustomPatchSync` with an accepted response and plain Location    | Absent          | Absent / violation                | Warning       |
| `ArmCustomPatchAsync` with plain `LroHeaders`                        | Absent          | Absent / violation                | Warning       |
| Same custom PATCH with semantic `ArmLroLocationHeader`               | Present         | `true` / compliant                | Compliant     |
| `ArmProviderActionSync` with an accepted response and plain Location | Absent          | Absent / violation                | Warning       |
| `ArmProviderActionAsync` with plain `LroHeaders`                     | Absent          | Absent / violation                | Warning       |
| Default `ArmProviderActionAsync`                                     | Present         | `true` / compliant                | Compliant     |

These are public template parameters documented in the ARM resource-operations
and long-running-operations guides, not suppressions or arbitrary emitted
overrides. Native tests exercise the rule without an emitter or TCGC.
Comparison fixtures verify emitted fields independently.

## Swagger migration boundary

The original
[linter code](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/az-common.ts)
and [linter documentation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/lro-extension.md)
select OAS2 PUT/PATCH/POST/DELETE operations with an explicit `202` response and
require a truthy `x-ms-long-running-operation`. GET and non-202 operations are
excluded. Native polling metadata, not an OpenAPI override, is this rule's
contract.

Registered resource POST/PUT/DELETE violations are already rejected by official
status-code checks. Explicit legacy extension `true`/`false` authoring is rejected
by `no-openapi` unless suppressed; it is not a native substitute for polling
metadata. The old suppressed resource-action fixtures remain comparison-only
evidence of those intentional exclusions. Catalog applicability is Both, but
this migration covers the uncovered ARM semantics, not a new data-plane rule.
See [migration evidence](./migration.md) for corpus populations and divergences.

## Test Cases

| ID                                  | Violation | Description                                                                                                                              |
| ----------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `missing-lro-for-202`               | false     | Comparison-only registered resource POST; official status-code prerequisite suppressed; intentionally outside the new local contract     |
| `false-lro-extension`               | false     | Comparison-only resource POST with a false emitted override; prerequisite and `no-openapi` suppressed                                    |
| `with-lro-extension`                | false     | Same ARM POST with explicit `x-ms-long-running-operation: true`; also requires `no-openapi` suppression                                  |
| `compliant-with-template`           | false     | Standard ARM async templates emit `x-ms-long-running-operation: true` without suppressions and also keep sync POSTs outside the selector |
| `custom-patch-sync-plain-location`  | true      | Supported synchronous PATCH Response customization loses polling semantics                                                               |
| `custom-patch-async-plain-location` | true      | Supported async PATCH LroHeaders customization loses polling semantics                                                                   |
| `custom-patch-semantic-location`    | false     | Documented semantic-header PATCH customization                                                                                           |
| `provider-sync-plain-location`      | true      | Supported provider POST Response customization loses polling semantics                                                                   |
| `provider-async-plain-location`     | true      | Supported provider POST LroHeaders customization loses polling semantics                                                                 |
| `provider-semantic-location`        | false     | Standard provider async template retains polling semantics                                                                               |
