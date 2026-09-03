---
validatorRuleId: UnSupportedPatchProperties
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/unsupported-patch-properties
coverageKind: lint
projectionScope: http-reachable
---

# UnSupportedPatchProperties

**Severity:** error

**Applies to:** Resource Manager (ARM)

PATCH body must not contain writable top-level `id`, `name`, `type`, or
`location` properties. Its `properties` bag must not contain a writable
`provisioningState`.

This rule is now covered by
`tsp-lintdiff-local-linter/unsupported-patch-properties`, which reports
the emitted JSON property when it is writable in PATCH. Read-only properties
and properties whose lifecycle visibility excludes update are compliant.

| ID                                        | Violation | Description                                                       |
| ----------------------------------------- | --------- | ----------------------------------------------------------------- |
| `patch-with-id-name`                      | true      | PATCH body includes writable `id`, `name`, and `type`             |
| `patch-with-location-provisioning-state`  | true      | PATCH includes writable `location` and nested `provisioningState` |
| `encoded-inherited-properties`            | true      | Encoded and inherited JSON properties are checked                 |
| `readonly-immutable-properties-compliant` | false     | Read-only and immutable properties are accepted                   |
| `readonly-ref-validator-discrepancy`      | false     | Records the validator's `$ref` sibling-resolution false positive  |
| `non-object-bodies-compliant`             | false     | Scalar and multi-model-union schemas expose no selected property  |

## Emission matrix

| Authored TypeSpec shape                      | AutoRest emitter branch                                                                    | Emitted field                                                                          | Swagger                  | TypeSpec lint | Fixture                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------ | ------------- | ----------------------------------------- |
| Direct writable model property               | `getSchemaForType` payload-property loop                                                   | Top-level `id`, `name`, or `type` without exemption                                    | Error                    | Warning       | `patch-with-id-name`                      |
| Writable `location` on a nullable model body | Nullable-union unwrap, then property mutability emission with default lifecycle visibility | Top-level `location` without exemption                                                 | Error                    | Warning       | `patch-with-location-provisioning-state`  |
| Writable nested property                     | Nested model through `resolveProperty` / `getSchemaOrRef`                                  | `properties.provisioningState` without exemption                                       | Error                    | Warning       | `patch-with-location-provisioning-state`  |
| Inherited or JSON-encoded property           | Base-model `allOf` and `resolveEncodedName`                                                | Reserved emitted JSON name                                                             | Error                    | Warning       | `encoded-inherited-properties`            |
| Read-only or update-excluded property        | `readOnly` or `x-ms-mutability` emission                                                   | Field absent or exempt from update                                                     | No error                 | No warning    | `readonly-immutable-properties-compliant` |
| Read-only property with a referenced type    | `resolveProperty` emits `$ref` with a `readOnly` sibling                                   | `properties.provisioningState` is read-only, but Spectral resolution drops the sibling | Validator false positive | No warning    | `readonly-ref-validator-discrepancy`      |
| Scalar or multi-model-union body             | Scalar and unsupported union schema                                                        | No object property selected by `getProperties`                                         | No error                 | No warning    | `non-object-bodies-compliant`             |
