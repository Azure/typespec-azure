---
changeKind: breaking
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Removing $armRenameListByOperation decorator so operation id is directly derived from operation name. Previously operation id is statically resolved and fixed :

- For top level resources, `[Resource]_ListByResourceGroup`
- For child resources, `[Resource]_ListBy[ParentResource]`

With this change, the operation name will form the second part of the operation id, just like other ARM operation templates.

```diff
-list is ArmResourceListByParent<Employee>;
+listByLocation is ArmResourceListByParent<Employee>;
```

You can modify the operation name to match existing spec to avoid breaking changes.
