---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: breaking
packages:
  - "@azure-tools/typespec-autorest"
---

Version enum is now omitted by default. Use `version-enum-strategy: include` to revert behavior.
