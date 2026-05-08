---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Extend the `arm-resource-patch` linter rule to validate PATCH request body schemas. New diagnostics are emitted when:

- A PATCH request body property is required and not read-only.
- A PATCH request body property has a default value (defaults are never applied to PATCH requests).
- A PATCH request body property is not updateable and not read-only.
- A PATCH operation specifies an explicit `content-type` other than `application/merge-patch+json` (or the implicit `application/json`).

Codefixes are provided to remove default values, mark properties as optional, and remove non-updateable properties from PATCH bodies.
