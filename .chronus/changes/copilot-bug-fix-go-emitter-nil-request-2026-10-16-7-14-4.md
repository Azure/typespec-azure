---
changeKind: fix
packages:
  - "@azure-tools/typespec-go"
---

Preserve explicit JSON nulls in request model fields in generated Go examples using `azcore.NullValue`, while retaining `nil` in response examples and collection entries.