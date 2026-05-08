---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Extend the `arm-resource-patch` linter rule to validate PATCH request body schemas. New diagnostics are emitted when:

- A PATCH request body property is required and the resource property it maps back to has any visibility other than `Lifecycle.Read` by itself (required properties are only allowed when the source resource property is purely read-only, in which case they are filtered out by visibility transforms).
- A PATCH request body property has a default value (defaults are never applied to PATCH requests).
- A PATCH request body property maps back to a resource property whose visibility must either include `Lifecycle.Update` or include `Lifecycle.Read` without `Lifecycle.Create`; other visibility combinations (e.g. `@visibility(Lifecycle.Create)` or `@visibility(Lifecycle.Create, Lifecycle.Read)`) are not allowed. The check is applied recursively to nested model and `Record<Model>` properties. Properties with default visibility, `@visibility(Lifecycle.Update)` (alone or in any combination), or `@visibility(Lifecycle.Read)` without `Lifecycle.Create` are allowed.
- A PATCH operation specifies an explicit `content-type` other than `application/merge-patch+json` (or the implicit `application/json`).

Codefixes are provided to remove default values, mark properties as optional, and remove non-updateable properties from PATCH bodies.
