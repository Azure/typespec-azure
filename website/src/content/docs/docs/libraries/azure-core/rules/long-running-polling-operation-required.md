---
title: "long-running-polling-operation-required"
---

```text title="Full name"
@azure-tools/typespec-azure-core/long-running-polling-operation-required
```

Long-running operations that return an `Operation-Location` header should have a linked polling operation. Use the `@pollingOperation` decorator to link a status polling operation.

#### ❌ Incorrect

Operation returning `Operation-Location` header without a linked polling operation:

```tsp
op read(): Foundations.LongRunningStatusLocation;
```

Custom header with `Operation-Location` without a polling operation:

```tsp
op readWithCustomHeader(): {
  @header("Operation-Location") location: string;
};
```

#### ✅ Correct

Use the `@pollingOperation` decorator to link a status polling operation:

```tsp
op getOperationStatus is Foundations.GetOperationStatus;

@pollingOperation(getOperationStatus)
op read(): Foundations.LongRunningStatusLocation;
```

```tsp
op getOperationStatus is Foundations.GetOperationStatus;

@pollingOperation(getOperationStatus)
op readWithCustomHeader(): {
  @header("Operation-Location") location: string;
};
```
