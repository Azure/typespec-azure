---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

`arm-no-record` rule should warn about any use of `Record<X>` not just when inside resource properties
