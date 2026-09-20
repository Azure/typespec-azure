---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `use-standard-lro-error` lint rule to require non-GET ARM long-running operations to define at least one default, 4xx, or 5xx error response and use the TypeSpec model `Azure.ResourceManager.CommonTypes.ErrorResponse` for every error payload. Error responses without a body are allowed.
