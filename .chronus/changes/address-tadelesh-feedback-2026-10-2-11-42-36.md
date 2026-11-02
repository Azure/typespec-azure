---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Align `@lroStatusMetadata` with standard TCGC scoped decorator handling. Repeated and overlapping declarations now use shared scope precedence instead of a separate duplicate diagnostic, and client-name conflicts use existing validation. Resolve selections during LRO response processing and cache them on the TCGC context while preserving effective properties and selected graph usage after legacy hierarchy reconciliation.

Extend shared `duplicate-client-name` validation to detect model-property collisions with inherited properties, including LRO status metadata. Overridden base properties are excluded, and inherited conflicts are not reported again on every descendant.