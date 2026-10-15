---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Expose declared union variant names and SDK types through `SdkUnionType.variants`. Preserve distinct names for variants sharing a payload type, and represent unnamed/default and synthesized variants with `name: undefined`. The existing `variantTypes` property retains the same type references and ordering.
