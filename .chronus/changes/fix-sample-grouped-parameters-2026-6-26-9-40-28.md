---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: fix
packages:
  - "@azure-tools/typespec-ts"
---

[typespec-ts] Fix sample generation for grouped and nested method parameters by resolving every HTTP parameter through `methodParameterSegments`, so flat, nested, and grouped parameters are emitted correctly without special casing.
