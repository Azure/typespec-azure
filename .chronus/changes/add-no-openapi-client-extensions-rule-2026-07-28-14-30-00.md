---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-azure-rulesets"
---

Add `no-openapi-client-extensions` linter rule that flags use of the `@typespec/openapi` `@extension` decorator to emit client-altering `x-ms-*`/`x-nullable` OpenAPI extensions (e.g. `x-ms-long-running-operation`, `x-ms-pageable`, `x-ms-enum`, `x-ms-client-name`, `x-ms-secret`). These extensions only affect the OpenAPI output, so other emitters produce an incorrect representation of the API; use the equivalent TypeSpec construct instead.
