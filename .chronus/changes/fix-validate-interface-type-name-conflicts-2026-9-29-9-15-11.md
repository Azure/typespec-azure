---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Report duplicate-client-name errors when an interface has the same effective client name as a model, enum, or union in the same namespace and language scope. Previously these declarations were checked separately; affected specifications must rename one of the declarations or its client name.