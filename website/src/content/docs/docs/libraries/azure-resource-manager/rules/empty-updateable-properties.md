---
title: "empty-updateable-properties"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/empty-updateable-properties
```

Resources with update operations should have updateable properties. The RP-specific properties of the resource (as defined in the `properties` property) should have at least one updateable property. Properties are updateable if they do not have a `@visibility` decorator, or if they include `update` in the `@visibility` decorator arguments.

#### ❌ Incorrect

```tsp
@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  update is ArmResourcePatchSync<Employee, EmployeeProperties>;
}

model EmployeeProperties {
  @visibility(Lifecycle.read)
  provisioningState?: string;
}
```

#### ✅ Correct

```tsp
@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  update is ArmResourcePatchSync<Employee, EmployeeProperties>;
}

model EmployeeProperties {
  @visibility(Lifecycle.read)
  provisioningState?: string;

  displayName?: string;
}
```
