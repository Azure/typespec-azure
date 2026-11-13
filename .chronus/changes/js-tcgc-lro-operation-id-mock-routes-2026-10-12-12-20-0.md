---
changeKind: fix
packages:
  - "@azure-tools/azure-http-specs"
---

Escape the colons in the `azure/client-generator-core/lro/operation-id` mock routes so `startTranslation` no longer intercepts `startTranslationWithPath` requests.
