---
title: "arm-resource-path-segment-invalid-chars"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-path-segment-invalid-chars
```

ARM resource path segments must contain only alphanumeric characters or dashes, starting with a lowercase letter.

#### ❌ Incorrect

```tsp
model Employee is TrackedResource<EmployeeProperties> {
  @key("employeeName")
  @segment("Employee_Items")
  @path
  name: string;
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
```
