This diagnostic is issued when `@responseAsBool` is applied to an operation that is not decorated with `@head`.

## Impact

- **Area:** HEAD response convenience modeling. Generation continues, but `@responseAsBool` is ignored because the operation is not a HEAD request.
- **Not affected:** The operation's HTTP verb and response schema are unchanged.

## ❌ Incorrect Usage

```typespec
@responseAsBool
@get // `@responseAsBool` requires a HEAD operation
op exists(): void;
```

## Diagnostic Message

For the declaration above, TCGC reports:

```text
@responseAsBool decorator can only be used on HEAD operations. Will ignore decorator on getOperation.
```

## ✅ How to Fix

Add `@head` when the operation is a HEAD request, or remove `@responseAsBool`:

```typespec
@responseAsBool
@head
op exists(): void;
```

## Suppression

Suppress this warning only if `@responseAsBool` is intentionally ignored because the operation is not a HEAD operation for this emitter.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/non-head-bool-response-decorator" "non-HEAD boolean response is intentional"
```
