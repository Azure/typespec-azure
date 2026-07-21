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
