This diagnostic is issued when two example files for the same `operationId` use the same `title`.

## Impact

- **Area:** Example file indexing. Blocks unambiguous loading of examples for a single operation because two files share the same operationId and title key.
- **Not affected:** The service definition and generated SDK type shapes are unchanged.

## Diagnostic Message

For the case above, TCGC reports:

```text
Example file get.json uses duplicate title 'get' for operationId 'get'
```

## ✅ How to Fix

Give each example a unique `title` within the same `operationId`.
