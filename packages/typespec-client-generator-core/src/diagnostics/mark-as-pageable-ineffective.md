This diagnostic is issued when `@markAsPageable` is applied to an operation that is already marked pageable with `@list`.

## Impact

- **Area:** Pageable SDK metadata. Generation continues using the existing `@list` paging metadata while the redundant legacy marker has no effect.
- **Not affected:** Page item and next-link metadata already discovered from the operation remain unchanged.

## ❌ Incorrect Usage

```typespec
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  salary: int32;
}

@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;

  @markAsPageable("csharp") // operation is already pageable via `ArmResourceListByParent`
  listEmployees is ArmResourceListByParent<Employee>;
}
```

## Diagnostic Message

TCGC reports:

```text
@markAsPageable decorator is ineffective since this operation is already marked as pageable with @list decorator. Please remove the @markAsPageable decorator.
```

## ✅ How to Fix

Remove `@markAsPageable` and keep the existing `@list` pageable metadata.

```typespec
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  salary: int32;
}

@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;

  listEmployees is ArmResourceListByParent<Employee>;
}
```

## Suppression

This diagnostic should not be suppressed. Remove the redundant `@markAsPageable`, or fix the operation so the marker is needed.
