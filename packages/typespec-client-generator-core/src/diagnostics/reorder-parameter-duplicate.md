This diagnostic is issued when `reorderParameters` lists the same parameter name more than once.

## Impact

- **Area:** Client customization transformations. Blocks `reorderParameters` because a duplicated name would make the generated method parameter order ambiguous.
- **Not affected:** The operation's actual parameters are unchanged.

## ❌ Incorrect Usage

```typespec
@service
namespace MyService {
  op myOp(a: string, b: string): void;
}

alias Modified = reorderParameters(MyService.myOp, #["a", "a"]); // `a` appears twice
```

## Diagnostic Message

TCGC reports:

```text
Parameter "a" appears more than once in the reorder list for operation "myOp".
```

## ✅ How to Fix

Include each parameter exactly once in the reorder list.

```typespec
@service
namespace MyService {
  op myOp(a: string, b: string): void;
}

alias Modified = reorderParameters(MyService.myOp, #["b", "a"]);
```
