---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Expose union variant names and SDK types through `SdkUnionType.variants`, an ordered `Map<string | symbol, SdkType>` matching the compiler's variant keys. Named variants use their declared string names, unnamed/default variants retain their compiler symbol keys, and synthesized variants use unique symbols. The existing `variantTypes` property retains the same type references and ordering.
