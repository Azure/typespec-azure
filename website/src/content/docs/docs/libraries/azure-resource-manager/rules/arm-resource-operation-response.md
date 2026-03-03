---
title: "arm-resource-operation-response"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response
```

[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema. Operations on a resource such as read, create, update, and list must all return the resource type itself (or a collection of the resource type for list operations).

#### ❌ Incorrect

```tsp
model Employee is TrackedResource<EmployeeProperties> {
  @key("employeeName")
  @segment("employees")
  @path
  name: string;
}

model OtherResource is TrackedResource<OtherProperties> {
  @key("otherName")
  @segment("others")
  @path
  name: string;
}

interface Employees {
  // Returns a different resource type than Employee
  get is ArmResourceRead<OtherResource>;
}
```

#### ✅ Correct

```tsp
model Employee is TrackedResource<EmployeeProperties> {
  @key("employeeName")
  @segment("employees")
  @path
  name: string;
}

interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplace<Employee>;
  update is ArmResourcePatchSync<Employee, EmployeeProperties>;
  listByResourceGroup is ArmResourceListByParent<Employee>;
}
```
