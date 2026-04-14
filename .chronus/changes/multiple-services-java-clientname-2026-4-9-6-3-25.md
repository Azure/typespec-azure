---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: feature
packages:
  - "@azure-tools/azure-http-specs"
---

Add `@clientName` Java-scoped renames for `Operations` and `SubNamespace` in the multiple-services spec to avoid name collisions in Java codegen.
