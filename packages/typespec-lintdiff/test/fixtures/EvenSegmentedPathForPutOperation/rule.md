---
validatorRuleId: EvenSegmentedPathForPutOperation
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/even-segmented-path-for-put-operation
coverageKind: lint
tspRuleset: resource-manager
---

# EvenSegmentedPathForPutOperation

**Severity:** error

**Applies to:** Resource Manager (ARM)

**Rule engine:** Spectral

## Description

PUT operations must have an even number of path segments after the provider namespace. An
odd-segmented path indicates an action-like operation, which should not use PUT.

## Source-of-truth notes

- Upstream `azure-openapi-validator` registers this as the ARM Spectral rule
  `EvenSegmentedPathForPutOperation` with RPC code `RPC-Put-V1-02`.
- The implementation is a path regex check over `"$[paths,'x-ms-paths'].*.put^~"` and only
  accepts provider paths that end in repeated `/{resourceType}/{resourceName}` or
  `/{resourceType}/default` pairs:
  `".*/providers/\\w+.\\w+(/\\w+/(default|{\\w+}))+$"`.
- The upstream unit test matrix covers 11 invalid paths and 9 valid paths, including provider
  roots, collection-level PUTs, action-like suffixes, singleton `default` resources, nested
  resources, scope placeholders, and extension-resource continuations.

## Source-of-truth notes

- Upstream `azure-openapi-validator` registers this as the ARM Spectral rule
  `EvenSegmentedPathForPutOperation` with RPC code `RPC-Put-V1-02`.
- The implementation is a path regex check over `"$[paths,'x-ms-paths'].*.put^~"` and only accepts
  provider paths that end in repeated `/{resourceType}/{resourceName}` or
  `/{resourceType}/default` pairs:
  `".*/providers/\\w+.\\w+(/\\w+/(default|{\\w+}))+$"`.
- The upstream unit tests cover 11 invalid paths and 9 valid paths, including provider-root PUTs,
  collection-level PUTs, action-like suffixes, singleton `default` resources, nested resources,
  scope placeholders, and extension-resource continuations.
- A later upstream change note explicitly mentions fixing a false alarm for this rule, so the
  prefix before `/providers/...` is part of the real selector boundary.

## TypeSpec source notes

The prior template-only conclusion was too weak. ARM authors can define custom PUT operations inside
`@armResourceOperations(#{ allowStaticRoutes: true })` interfaces, which keeps the operation on an
ARM authoring surface without triggering `@azure-tools/typespec-azure-resource-manager/arm-resource-operation`.

That direct authorable path means this rule is a real local lint opportunity. The local
`tsp-lintdiff-local-linter/even-segmented-path-for-put-operation` rule now mirrors the shipped
validator regex against emitted ARM PUT paths.

## Semantic coverage notes

The local suite now covers these authorable upstream semantic cells directly:

- provider-root PUT with no resource type/name pair after the namespace => invalid
- collection-level PUT that stops at the resource type segment => invalid
- action-like odd suffix after a resource instance path => invalid
- standard ARM template create/update path => compliant
- singleton `default` resource path => compliant
- nested `/{type}/{name}/{nestedType}/{nestedName}` path => compliant
- scope-prefixed `/{scope}/providers/...` resource path => compliant

Residual boundary note:

- Upstream treats extension-resource continuations such as
  `/.../providers/Microsoft.Album/Albums/{albumName}` as valid for this rule. That path shape is
  still authorable in TypeSpec, but this repo also has a stricter direct lint,
  `tsp-lintdiff-local-linter/extension-resource-path-pattern`, that rejects hardcoded extension
  scopes. We therefore document that cell instead of using it as the primary isolated compliance
  proof for this rule.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `provider-root-put` | true | Provider-root PUT stops at the namespace and never reaches a `{resourceType}/{resourceName}` pair. |
| `collection-level-put` | true | Custom ARM PUT ends at `/widgets` without a trailing resource-name segment. |
| `odd-segment-put` | true | Custom ARM PUT ends with `/config`, leaving an odd trailing segment after the resource instance pair. |
| `compliant` | false | Standard `@armResourceOperations` templates emit an even-segmented ARM PUT path. |
| `singleton-default-put` | false | Custom ARM PUT ending in `/widgets/default` matches the validator's singleton allowance. |
| `nested-resource-put` | false | Custom ARM PUT ending in `/widgets/{widgetName}/configs/{configName}` preserves even trailing pairs. |
| `scope-placeholder-put` | false | Scope-prefixed custom ARM PUT still passes because the selector only constrains the suffix after `/providers/...`. |
