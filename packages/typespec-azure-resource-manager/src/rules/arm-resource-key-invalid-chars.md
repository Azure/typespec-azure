Beyond alphanumeric characters, a resource key may also contain dashes, but it must start with a lowercase letter.

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
