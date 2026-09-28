---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `use-standard-lro-error` lint rule to require non-GET ARM long-running operations to define at least one default, 4xx, or 5xx error response and use the TypeSpec model `Azure.ResourceManager.CommonTypes.ErrorResponse` for every error payload. Error responses without a body are allowed.

Error bodies must use the standard model directly, including through aliases or an explicit `@body` property. Nullable standard errors remain accepted. `model is` copies and spreads are rejected, including implicit response wrappers with HTTP status codes or headers.
