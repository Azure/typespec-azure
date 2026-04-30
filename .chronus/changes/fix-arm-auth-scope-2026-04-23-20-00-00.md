---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-autorest"
---

Fix `@armProviderNamespace` to inject the canonical absolute ARM scope `https://management.azure.com/.default` as the default OAuth2 scope instead of the bare relative `user_impersonation` value. For backwards compatibility with existing ARM Swagger, the `@azure-tools/typespec-autorest` emitter now rewrites this scope back to `user_impersonation` when emitting OpenAPI v2 for namespaces decorated with `@armProviderNamespace`.
