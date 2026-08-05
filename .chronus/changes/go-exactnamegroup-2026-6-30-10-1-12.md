---
changeKind: fix
packages:
  - "@azure-tools/typespec-go"
---

Honor isExactName for types and model properties. Note that if the type/property is public, the exact name will be slightly transformed to follow Go export rules.