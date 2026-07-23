This diagnostic is issued when `reorderParameters` omits a parameter that exists on the operation.

## Impact

- **Area:** Client customization transformations. Blocks `reorderParameters` because the transformed signature would omit an existing operation parameter.
- **Not affected:** The original method parameter set remains intact.

#### ❌ Incorrect Usage

```typespec
@service
namespace MyService {
  op myOp(a: string, b: string, c: string): void;
}

alias Modified = reorderParameters(MyService.myOp, #["c", "a"]); // ❌ missing parameter `b`
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Parameter "b" from operation "myOp" is missing in reorder list.
```

#### ✅ How to Fix

Include every operation parameter exactly once in the reorder list.
