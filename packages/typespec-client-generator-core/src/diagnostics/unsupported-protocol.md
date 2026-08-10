This diagnostic is issued when TCGC cannot resolve an operation as an HTTP or HTTPS operation.

## Impact

- **Area:** Service method generation. Blocks creating a TCGC service operation for a non-HTTP/non-HTTPS protocol operation.
- **Not affected:** The TypeSpec operation can still exist outside TCGC HTTP client generation.

## Diagnostic Message

TCGC reports:

```text
Currently we only support HTTP and HTTPS protocols
```

## ✅ How to Fix

Add appropriate HTTP route and verb decorators to the operation, or remove it from the TCGC-generated client surface.
