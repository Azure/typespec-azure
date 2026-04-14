---
title: "arm-resource-key-invalid-chars"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-key-invalid-chars
```

ARM resource key must contain only alphanumeric characters or dashes, starting with a lowercase letter.

#### ❌ Incorrect

```tsp
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee, KeyName = "employee_name">;
}
```

#### ✅ Correct

```tsp
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}
```
