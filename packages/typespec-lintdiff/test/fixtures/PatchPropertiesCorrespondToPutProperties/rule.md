---
validatorRuleId: PatchPropertiesCorrespondToPutProperties
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/patch-properties-correspond-to-put-properties
coverageKind: lint
projectionScope: http-reachable
---

# PatchPropertiesCorrespondToPutProperties

**Severity:** error

**Applies to:** Resource Manager (ARM)

PATCH body properties must correspond to properties in the PUT resource model.

The local lint `tsp-lintdiff-local-linter/patch-properties-correspond-to-put-properties`
compares JSON leaf-property names in corresponding ARM PATCH and PUT request bodies through
supported compiler, HTTP, and versioning metadata. Like the Swagger rule, nesting containers
with direct payload properties do not contribute to property identity.

For each service version, `resolveVersions` supplies the service and dependency version map.
`getAddedOnVersions` and `getRemovedOnVersions` determine operation, interface, explicit body
parameter, and model-property availability before pairing operations or comparing leaves.
Inherited and spread properties and nested namespaces use the same availability check.
Diagnostics are deduplicated across versions by PATCH operation for body errors and by source
target plus JSON name for missing properties.

This is **availability-aware comparison, not historical shape projection**: `@renamedFrom`,
`@typeChangedFrom`, historical route changes, and historical body-type changes are not reconstructed.
Current names and types can therefore produce inaccurate historical results; neither the native
tests nor selected-version reachability filtering establishes full historical equivalence.
Production logic does not emit Swagger, import an emitter, use OpenAPI/TCGC helpers, or mutate
the compiler graph. See [migration evidence](migration.md) for the observed limits.

The provider-namespace guard isolates ARM services in lintdiff's mixed all-rules runner.
Promotion to an ARM-only ruleset should remove this infrastructure guard, retain ordinary and
nested-namespace coverage, and leave the new official rule disabled by default.

The staging Swagger implementation compares whole emitted property-schema objects with deep
equality, despite the rule documentation defining correspondence by property presence. That
incidental comparison reports compliant properties when descriptions or `x-ms-client-name` values
differ. The TypeSpec lint intentionally does not reproduce those false positives.

| ID                                    | Violation | Description                                                        |
| ------------------------------------- | --------- | ------------------------------------------------------------------ |
| `patch-extra-property`                | true      | Nested PATCH leaf property is absent from PUT                      |
| `encoded-name-mismatch`               | true      | Same authored name has different emitted JSON names                |
| `allof-wrapper-name-mismatch`         | true      | Differently named allOf-only wrappers remain leaf properties       |
| `missing-patch-body`                  | true      | PATCH operation has no request body                                |
| `empty-patch-model`                   | true      | PATCH body has no emitted properties                               |
| `missing-put-body`                    | true      | PUT operation has no request body                                  |
| `inherited-synthesized-discriminator` | true      | Inherited missing discriminator emits a PATCH-only leaf            |
| `synthesized-discriminator-mismatch`  | true      | Direct missing discriminator emits a PATCH-only leaf               |
| `compliant-subset`                    | false     | PATCH leaf properties are a subset of PUT                          |
| `different-nesting-compliant`         | false     | Matching leaf is accepted at a different nesting level             |
| `encoded-name-compliant`              | false     | Different authored names emit the same JSON name                   |
| `schema-value-validator-discrepancy`  | false     | Description-only difference exposes Swagger's deep-equality defect |
| `synthesized-discriminator-compliant` | false     | Matching synthesized discriminator is accepted                     |
| `type-family-compliant`               | false     | Scalar, array, record, union, nullable, and empty-model leaves     |
