---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Remove restrictions requiring Foundation.Resource in ArmResourceListByParent. This will allow using the template for non-standard resources / collection actions that return a list.
