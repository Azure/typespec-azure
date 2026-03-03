---
title: "arm-resource-operation"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-operation
```

Validate ARM Resource operations. All resource operations must be defined inside an interface, include an `api-version` parameter, and use the correct decorator for the HTTP verb.

#### ❌ Incorrect

```tsp
// Operation defined outside of an interface
op getEmployee is ArmResourceRead<Employee>;
```

#### ✅ Correct

```tsp
interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplace<Employee>;
  update is ArmResourcePatchSync<Employee, EmployeeProperties>;
  delete is ArmResourceDeleteSync<Employee>;
  listByResourceGroup is ArmResourceListByParent<Employee>;
}
```
