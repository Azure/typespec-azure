ARM resource key must contain only alphanumeric characters or dashes, starting with a lowercase letter.

## Impact

- **Area:** SDK

Invalid characters in a resource key produce invalid parameter names in SDKs.

## ❌ Incorrect

```tsp
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee, KeyName = "employee_name">;
}
```

## ✅ Correct

```tsp
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}
```

## Suppression

Do not suppress. Use the correct name in `@key` or the `ResourceNameParameter` template.
