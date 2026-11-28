---
changeKind: fix
packages:
  - "@azure-tools/azure-http-specs"
---

Escape literal colons in the `azure/client-generator-core/lro/operation-id` and `azure/client-generator-core/lro/metadata` mock API routes so that `translations:start` no longer captures requests to `translations:start-with-path`.
