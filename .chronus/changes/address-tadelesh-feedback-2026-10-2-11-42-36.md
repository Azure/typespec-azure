---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Align @lroStatusMetadata with standard TCGC scoped decorator handling. Repeated and overlapping declarations now use shared scope precedence instead of a separate duplicate diagnostic, and client-name conflicts use existing validation. Resolve selections during LRO response processing and cache them on the TCGC context while preserving effective properties and selected graph usage after legacy hierarchy reconciliation.