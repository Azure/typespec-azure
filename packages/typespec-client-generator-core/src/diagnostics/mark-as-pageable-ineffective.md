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

For the declaration above, TCGC reports:

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

Suppress this warning only if the redundant `@markAsPageable` annotation is kept for source compatibility while real `@list` metadata drives paging.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/mark-as-pageable-ineffective" "redundant pageable marker kept for compatibility"
```
