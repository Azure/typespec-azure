This diagnostic is issued when `@markAsPageable` is applied to an operation that is already marked pageable with `@list`.

To fix this issue, remove `@markAsPageable` and keep the existing `@list` pageable metadata.

### Example

```typespec
using Azure.ClientGenerator.Core.Legacy;
using Azure.ResourceManager;

model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  salary: int32;
}

@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;

  @markAsPageable("csharp")
  listEmployees is ArmResourceListByParent<Employee>;
}
```

`ArmResourceListByParent` already marks `listEmployees` as pageable with real list metadata, so remove the legacy `@markAsPageable` decorator.
