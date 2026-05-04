---
title: arm-legacy-operations-discourage
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-legacy-operations-discourage
```

Avoid using the `LegacyOperations` interface unless migrating a brownfield service.

#### ❌ Incorrect

```tsp
@armResourceOperations
interface MyResources extends Azure.ResourceManager.Legacy.LegacyOperations {}
```

#### ✅ Correct

Use standard ARM resource operation templates:

```tsp
@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  delete is ArmResourceDeleteWithoutOkAsync<Employee>;
  list is ArmResourceListByParent<Employee>;
}
```
