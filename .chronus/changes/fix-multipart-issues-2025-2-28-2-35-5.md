---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Fix multipart not applying `x-ms-client-name` when using an explicit part name different from the property name
