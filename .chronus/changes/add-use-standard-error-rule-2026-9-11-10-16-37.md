---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `use-standard-error` lint rule to require ARM operations, including synchronous and GET operations, to define at least one response model marked with `@error` and use the TypeSpec model `Azure.ResourceManager.CommonTypes.ErrorResponse` for every marked error payload. Inherited error markers are recognized. Error classification is independent of HTTP status codes: unmarked 4xx/5xx responses do not satisfy the declaration requirement, while marked responses are checked even with non-error statuses. Error responses without a body are rejected except for protocol-required bodyless HEAD errors; HEAD operations must still declare a marked error response.

Error bodies must use the standard model directly, including through aliases or an explicit `@body` property. Nullable standard errors remain accepted. `model is` copies and spreads are rejected, including implicit response wrappers with HTTP status codes or headers.
