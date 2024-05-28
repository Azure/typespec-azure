---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: breaking
packages:
  - "@azure-tools/typespec-autorest"
---

Enums are not extensible by default anymore. Update to an extensible union `union Foo {a: "a", b: "b", string}`
