---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Extend `list-response-envelope` to require the semantic `@nextLink` name in the serialized response body for each declared media type, accounting for `@encodedName` and excluding HTTP headers and `@bodyIgnore` properties. Check fallback success and default responses without imposing the stricter HTTP 200 envelope shape on them.
