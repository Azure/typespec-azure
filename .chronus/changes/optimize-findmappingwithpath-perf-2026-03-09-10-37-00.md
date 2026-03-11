---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Optimize `findMappingWithPath` in `getMethodParameterSegments` for better performance with deeply nested models. Replace O(n) `Array.shift()` with O(1) index-based dequeue, and use parent pointer map instead of O(depth) path copying per node.
