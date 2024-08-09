---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-core"
---

Replace `no-operation-id` linter rule with a more generic `no-openapi` rule guarding against any use of openapi decorators
