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
compares the JSON leaf-property names emitted for corresponding ARM PATCH and PUT request bodies.
Like the Swagger rule, nesting containers do not contribute to property identity.

The staging Swagger implementation compares whole emitted property-schema objects with deep
equality, despite the rule documentation defining correspondence by property presence. That
incidental comparison reports compliant properties when descriptions or `x-ms-client-name` values
differ. The TypeSpec lint intentionally does not reproduce those false positives.

| ID                                   | Violation | Description                                                        |
| ------------------------------------ | --------- | ------------------------------------------------------------------ |
| `patch-extra-property`               | true      | Nested PATCH leaf property is absent from PUT                      |
| `encoded-name-mismatch`              | true      | Same authored name has different emitted JSON names                |
| `allof-wrapper-name-mismatch`        | true      | Differently named allOf-only wrappers remain leaf properties       |
| `missing-patch-body`                 | true      | PATCH operation has no request body                                |
| `empty-patch-model`                  | true      | PATCH body has no emitted properties                               |
| `missing-put-body`                   | true      | PUT operation has no request body                                  |
| `compliant-subset`                   | false     | PATCH leaf properties are a subset of PUT                          |
| `different-nesting-compliant`        | false     | Matching leaf is accepted at a different nesting level             |
| `encoded-name-compliant`             | false     | Different authored names emit the same JSON name                   |
| `schema-value-validator-discrepancy` | false     | Description-only difference exposes Swagger's deep-equality defect |
| `type-family-compliant`              | false     | Scalar, array, record, union, nullable, and empty-model leaves     |
