---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

treat null as a type and nullable type as a union. Expose helper functions `isNullable` and `getUnderlyingNullableType` to handle these nullable types.
