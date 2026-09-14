This diagnostic is issued when an `@override` operation intentionally replaces the original response type with `void` or `bytes` through `replaceResponseWithVoid` or `replaceResponseWithBytes`.

## Impact

- **Area:** Client method override signatures. Generation continues, but the generated client method no longer surfaces the original modeled response type.
- **Not affected:** The service still declares its original wire response, and the HTTP response metadata is preserved.

## ❌ Incorrect Usage

This is not an error, but the warning highlights that the method response type was replaced:

```typespec
@service
namespace MyService {
  @post op delete(): DeleteResult;
}

alias DeleteResponse = replaceResponseWithVoid(MyService.delete);
@@override(MyService.delete, DeleteResponse);
```

## Diagnostic Message

TCGC reports:

```text
Method "delete" has an intentional response replacement in the override operation. Suppress this warning if the replacement is expected.
```

## ✅ How to Fix

If the replacement is intentional, suppress the warning to acknowledge that the method response type was deliberately replaced.

## Suppression

Suppress this warning when the response replacement is expected.

```typespec
#suppress "@azure-tools/typespec-client-generator-core/override-response-replacement" "intentionally returning void to SDK consumers"
alias DeleteResponse = replaceResponseWithVoid(MyService.delete);
@@override(MyService.delete, DeleteResponse);
```
