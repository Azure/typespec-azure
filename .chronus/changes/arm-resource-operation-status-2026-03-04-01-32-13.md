---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add `ResourceOperationStatus<Properties, StatusValues>` model (without `@path`/`@key`/`@segment` on `id`, no `@parentResource`) and `GetResourceOperationStatus<Response, Scope, Parameters, Error>` operation template that uses a `Scope` parameter (defaulting to `TenantActionScope`) to generate paths ending with `/operationStatuses/{operationId}` after the provider segments.
