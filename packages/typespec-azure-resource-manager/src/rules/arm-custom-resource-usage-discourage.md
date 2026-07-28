Avoid using the `@customAzureResource` decorator. It doesn't provide validation for ARM resources, and its usage should be limited to brownfield services migration.

## Impact

- **Area:** API

The resource does not use the ARM common-types resource base types.

## ❌ Incorrect

```tsp
@Azure.ResourceManager.Legacy.customAzureResource
model Person {
  name: string;
}
```

## ✅ Correct

Use standard ARM resource types:

```tsp
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}
```

## Suppression

Treat like any resource that does not use common-types. Use `TrackedResource`, `ProxyResource`, or `ExtensionResource`.
