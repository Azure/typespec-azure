---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Fix: Discriminated inheritance wasn't resolving the `x-ms-discriminator-value` when it had an intermediate model.
