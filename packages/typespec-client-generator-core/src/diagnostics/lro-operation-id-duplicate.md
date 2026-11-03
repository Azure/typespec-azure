This diagnostic is issued when more than one path parameter or more than one response model property on the same linked status-monitor operation has an active `@lroOperationId` declaration for the current emitter. One path source and one property source may be selected together.

## Impact

- **Area:** LRO operation ID metadata. Generation reports an error because multiple sources of the same kind are selected.
- **Not affected:** The complete polling URI and normal LRO polling behavior are unchanged.

## ❌ Incorrect Usage

Assume `JobStatus` is the response model of the operation referenced by `@pollingOperation`.

```typespec
model JobStatus {
  @lroOperationId
  id: string;

  @lroOperationId
  alternateId: string;

  status: JobState;
}
```

## Diagnostic Message

TCGC reports:

```text
@lroOperationId selects more than one source of the same kind on the linked status-monitor operation in the active emitter scope.
```

## ✅ How to Fix

Keep at most one active `@lroOperationId` path parameter and one active response model property for each emitter scope. Adjust overlapping positive or negated scopes when language-specific declarations are required.

```typespec
model JobStatus {
  @lroOperationId
  id: string;

  alternateId: string;
  status: JobState;
}
```

## Suppression

This diagnostic should not be suppressed. Select one operation ID source of each kind per emitter.
