---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `consistent-patch-properties` lint rule to check that PATCH body properties exist at the same nesting level in the resource model.

Prefer the operation's associated resource model, including for asynchronous PATCH operations without a GET, and fall back to response bodies for operations without a resource association.
