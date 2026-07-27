---
validatorRuleId: AllResourcesMustHaveGetOperation
engine: native
tspLints:
  - tsp-lintdiff-local-linter/all-resources-must-have-get-operation
coverageKind: lint
---

# AllResourcesMustHaveGetOperation

**Severity:** warning

**Applies to:** Resource Manager (ARM)

All ARM resources with authorable PUT or PATCH lifecycle operations must also define a GET/read
operation.

## Semantic coverage notes

The upstream validator implementation effectively checks ARM resources that have PUT or PATCH
operations and reports when the same resource has no GET operation. It also ignores polymorphic
concrete resources whose base resource carries a discriminator.

The local lint covers the authorable TypeSpec matrix for that behavior:

- top-level resource with create/update behavior but no get => invalid
- nested resource with create/update behavior but no get => invalid
- patch-only resource with no get => invalid
- resource with get + write operations => valid
- resource with no put/patch operations => valid for this rule

The upstream validator also ignores concrete polymorphic ARM resources whose base resource carries a
discriminator. That shape is not cleanly authorable in this repo's TypeSpec ARM surface today
without falling back to legacy helpers or triggering unrelated ARM diagnostics, so it is documented
as an unrepresentable cell rather than a local fixture.

Raw OpenAPI-only `x-ms-azure-resource` shapes that are not modeled as ARM resources in TypeSpec are
also outside this native lint's scope.

## Test Cases

| ID | Violation | Description |
| -- | --------- | ----------- |
| `missing-get` | yes | Top-level tracked resource with createOrUpdate but no get |
| `nested-missing-get` | yes | Nested child resource still requires get when createOrUpdate exists |
| `patch-without-get` | yes | Patch-only resources are also in scope |
| `has-get` | no | Resource with get + write operations is compliant |
| `delete-only-no-get` | no | Resources without put/patch operations are outside the implemented scope |
