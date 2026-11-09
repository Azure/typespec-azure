---
changeKind: internal
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Align `@lroStatusMetadata` with standard TCGC scoped decorator handling. Repeated and overlapping declarations use shared scope precedence, and client-name validation retains its existing behavior. Preserve selected metadata properties, output usage, access, and serialization after legacy hierarchy reconciliation.