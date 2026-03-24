---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Optimize `findContextPath` performance by caching context paths for anonymous types. Previously, each anonymous type lookup would iterate through all operations (O(n×m) complexity). Now builds a reverse index once and uses O(1) lookups. This dramatically improves SDK generation time for large specs - ML Services improved from ~15s to ~2s (7.5x faster).
