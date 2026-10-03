---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add the `no-operation-group-name-conflict` lint rule to warn when an operation group's
common SDK name conflicts with a named type reachable in the same root client's API.
