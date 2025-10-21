---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add new `External` usage flag to `UsageFlags` enum. This flag is automatically set for types that are only referenced by external types (types with `@alternateType` decorator pointing to external library types). The flag propagates recursively through the type graph, marking all types that are exclusively accessible through external types.
