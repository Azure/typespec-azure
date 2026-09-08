This diagnostic is issued when an `@override` operation declares a response type that is not compatible with the original operation's response type.

## Impact

- **Area:** Client method override signatures. Blocks an override whose response type cannot be mapped back to the original service operation's response.
- **Not affected:** The original operation remains available with its declared response type.

## ❌ Incorrect Usage

```typespec
@service
namespace MyService {
  @post op func(): string;
}

namespace MyCustomizations {
  op func(): int32; // response type is unrelated to the original `string` response
}
@@override(MyService.func, MyCustomizations.func);
```

## Diagnostic Message

TCGC reports:

```text
Method "func" has a different response type in the override operation. Use replaceResponseWithVoid or replaceResponseWithBytes for an intentional response replacement.
```

## ✅ How to Fix

Update the override operation so its response type matches the original operation, or use `replaceResponseWithVoid` or `replaceResponseWithBytes` when the response replacement is intentional.

```typespec
@service
namespace MyService {
  @post op func(): string;
}

namespace MyCustomizations {
  op func(): string;
}
@@override(MyService.func, MyCustomizations.func);
```
