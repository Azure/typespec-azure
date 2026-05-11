---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix regression introduced in PR #4341: a server URL template parameter (declared in `@server`) named `apiVersion`/`api-version` with a plain `string` type in a versioned service is now correctly recognized as `isApiVersionParam`.
