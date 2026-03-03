---
title: "patch-envelope"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/patch-envelope
```

Patch envelope properties should match the resource properties. If a resource defines envelope properties such as `identity`, `managedBy`, `plan`, `sku`, or `tags`, these properties must also be present in the PATCH request body so they can be updated.

#### ❌ Incorrect

```tsp
model Employee is TrackedResource<EmployeeProperties> {
  @key("employeeName")
  @segment("employees")
  @path
  name: string;

  ...ManagedServiceIdentityProperty;
}

@armResourceOperations
interface Employees {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  // update model is missing the 'identity' envelope property
  update is ArmResourcePatchSync<Employee, EmployeeProperties>;
}
```

#### ✅ Correct

```tsp
model Employee is TrackedResource<EmployeeProperties> {
  @key("employeeName")
  @segment("employees")
  @path
  name: string;

  ...ManagedServiceIdentityProperty;
}

model EmployeePatch {
  ...ManagedServiceIdentityProperty;
  properties?: EmployeeProperties;
}

@armResourceOperations
interface Employees {
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  update is ArmResourcePatchSync<Employee, EmployeePatch>;
}
```
