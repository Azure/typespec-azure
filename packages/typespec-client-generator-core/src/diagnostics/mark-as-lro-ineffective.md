This diagnostic is issued when `@markAsLro` is applied to an operation that already has real LRO metadata.

## Impact

- **Area:** LRO SDK metadata. Blocks or rejects a redundant legacy LRO marker when the operation already has real long-running-operation metadata.
- **Not affected:** Existing LRO polling metadata remains the source of generated behavior.

## Diagnostic Message

For the case above, TCGC reports:

```text
@markAsLro decorator is ineffective since this operation already returns real LRO metadata. Please remove the @markAsLro decorator.
```

## ✅ How to Fix

Remove `@markAsLro` from operations that are already modeled as long-running operations.
