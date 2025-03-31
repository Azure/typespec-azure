---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Take into account `@bodyRoot` to anchor parameters when creating generated names for anonymous models. Breaking because it can add to the generated name.