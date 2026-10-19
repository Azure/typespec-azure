---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add the `no-operation-group-name-conflict` lint rule to warn when an interface or
namespace containing operations has the same name as a type declared in its parent
namespace. Check common and language-specific names without constructing SDK clients.
