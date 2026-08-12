---
validatorRuleId: PatchBodyParametersSchema
engine: spectral
tspLints:
  - tsp-lintdiff-local-linter/patch-body-parameters-schema
coverageKind: partial
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

## Test Cases

| ID                             | Violation | Description                                                      |
| ------------------------------ | --------- | ---------------------------------------------------------------- |
| `required-patch-property`      | true      | PATCH body contains required property                            |
| `default-patch-property`       | true      | PATCH body contains default-valued property                      |
| `create-only-patch-property`   | true      | PATCH body contains a property emitted as create-only mutable    |
| `top-level-identity-compliant` | false     | PATCH body top-level `identity` is skipped like the Swagger rule |
