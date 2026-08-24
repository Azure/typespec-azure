---
validatorRuleId: PatchBodyParametersSchema
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/patch-body-parameters-schema
coverageKind: partial
projectionScope: http-reachable
---

# PatchBodyParametersSchema

**Severity:** error

**Applies to:** Resource Manager (ARM)

PATCH body parameters must not have required properties, defaults, or create-only members.

The local lint `tsp-lintdiff-local-linter/patch-body-parameters-schema` walks ARM PATCH request
body models recursively and flags the authorable TypeSpec sad paths enforced by the Swagger rule:

- required properties
- default-valued properties
- properties emitted with `x-ms-mutability: ["create"]`

The Swagger rule skips a top-level PATCH body property named `identity` before checking that
property or its children. The local lint mirrors that exception to avoid false positives on
identity envelopes.

The local lint uses TypeSpec HTTP metadata to mirror Autorest's effective PATCH schema. Properties
omitted by request visibility are not checked, and requiredness follows emitted PATCH optionality.

## Test Cases

| ID                                  | Violation | Description                                                      |
| ----------------------------------- | --------- | ---------------------------------------------------------------- |
| `required-patch-property`           | true      | PATCH body contains required property                            |
| `nullable-model-required-property`  | true      | Nullable PATCH model contains a required nested property         |
| `default-patch-property`            | true      | PATCH body contains truthy and falsy default-valued properties   |
| `create-only-patch-property`        | true      | PATCH body contains a property emitted as create-only mutable    |
| `implicit-optional-patch-compliant` | false     | PATCH transforms optionalize or omit source properties           |
| `top-level-identity-compliant`      | false     | PATCH body top-level `identity` is skipped like the Swagger rule |
