---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-core"
---

Fix `rpc-operation-request-body` rule not actually checking for a body parameter.
