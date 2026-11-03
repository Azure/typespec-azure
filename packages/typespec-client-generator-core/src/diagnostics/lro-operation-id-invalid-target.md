This diagnostic is issued when `@lroOperationId` targets a property that is not a supported operation ID source.

`@lroOperationId` identifies either a path parameter of the linked LRO status-monitor operation or a string-like property of its response model.

## Impact

- **Area:** LRO operation ID metadata. Compilation reports an error for an invalid source.
- **Not affected:** The service's HTTP contract and normal LRO polling behavior are unchanged.

## ❌ Incorrect Usage

Assume `JobStatus` is the response model of the operation referenced by `@pollingOperation`.

```typespec
model JobStatus {
  @lroOperationId
  id: int32;

  status: JobState;
}
```

## Diagnostic Message

TCGC reports:

```text
@lroOperationId can only be applied to a path parameter of the linked status-monitor operation or a string-like property of its response model.
```

## ✅ How to Fix

Move the decorator to the corresponding `@path` parameter of the operation referenced by `@pollingOperation`, or to the string-like operation ID property on that operation's response model. The source must match the service contract; remove the decorator if there is no supported source.

For a service whose status monitor returns a string ID:

```typespec
model JobStatus {
  @lroOperationId
  id: string;

  status: JobState;
}
```

## Suppression

This diagnostic should not be suppressed. Correct the operation ID source or remove the decorator.
