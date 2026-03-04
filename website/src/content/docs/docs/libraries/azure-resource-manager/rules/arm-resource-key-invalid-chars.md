---
title: "arm-resource-key-invalid-chars"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-key-invalid-chars
```

ARM resource key must contain only alphanumeric characters, starting with a lowercase letter. Parameters must consist of alphanumeric characters starting with a lower case letter.

#### ❌ Incorrect

```tsp
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee, KeyName = "employee-name">;
}
```

#### ✅ Correct

```tsp
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}
```
