---
title: arm-resource-interface-requires-decorator
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator
```

Each resource interface must have an `@armResourceOperations` decorator to associate the interface with its ARM resource type.

#### ❌ Incorrect

```tsp
interface MyResourceOperations {
  get is ArmResourceRead<MyResource>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<MyResource>;
  delete is ArmResourceDeleteWithoutOkAsync<MyResource>;
}
```

#### ✅ Correct

```tsp
@armResourceOperations(MyResource)
interface MyResourceOperations {
  get is ArmResourceRead<MyResource>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<MyResource>;
  delete is ArmResourceDeleteWithoutOkAsync<MyResource>;
}
```
