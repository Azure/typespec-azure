This diagnostic is issued when an array parameter uses `@encode` with an array encoding other than `ArrayEncoding.pipeDelimited` or `ArrayEncoding.spaceDelimited` for collection format.

## Impact

- **Area:** Collection parameter serialization metadata. Generation continues with the fallback collection format when an unsupported array encoding is used.
- **Not affected:** Non-array parameters and the declared parameter location are unchanged.

## ❌ Incorrect Usage

```typespec
@service
namespace My.Service;

op myOp(@header @encode("tsv") header: string[]): void; // `tsv` is not a supported collection encoding
```

## Diagnostic Message

TCGC reports:

```text
Only encode of `ArrayEncoding.pipeDelimited` and `ArrayEncoding.spaceDelimited` is supported for collection format.
```

## ✅ How to Fix

Use `ArrayEncoding.pipeDelimited`, use `ArrayEncoding.spaceDelimited`, rely on the default CSV format, or use exploded query serialization.

```typespec
@service
namespace My.Service;

op myOp(@header @encode(ArrayEncoding.pipeDelimited) header: string[]): void;
```

## Suppression

This diagnostic should not be suppressed. Fix the `@encode` usage to a supported collection-format encoding.
