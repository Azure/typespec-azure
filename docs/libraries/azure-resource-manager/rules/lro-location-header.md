---
title: lro-location-header
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/lro-location-header
```

Long-running (LRO) operations with 202 responses must have a "Location" response header.

#### ❌ Incorrect

```tsp
@armResourceOperations
interface Employees {
  delete is ArmResourceDeleteWithoutOkAsync<Employee, EmployeeProperties, LroHeaders = {}>;
}
```

#### ✅ Correct

```tsp
@armResourceOperations
interface Employees {
  delete is ArmResourceDeleteWithoutOkAsync<Employee, EmployeeProperties>;
}
```
