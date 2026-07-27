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
body models recursively and currently flags the authorable TypeSpec sad paths that are proven in
this repo:

- required properties
- default-valued properties

The upstream `x-ms-mutability: ["create"]` branch is not yet covered by a clean local TypeSpec
fixture, so the migration result is intentionally tracked as **partial** rather than fully
equivalent.

## Test Cases

| ID                        | Violation | Description                                  |
| ------------------------- | --------- | -------------------------------------------- |
| `required-patch-property` | true      | PATCH body contains required property        |
