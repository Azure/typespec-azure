This diagnostic is issued when `reorderParameters` includes a parameter name that does not exist on the operation.

## Impact

- **Area:** Client customization transformations. Blocks `reorderParameters` because the order list names a parameter that the operation does not have.
- **Not affected:** Existing operation parameters and their wire metadata are unchanged.

#### ❌ Incorrect Usage

```typespec
@service
namespace MyService {
  op myOp(a: string, b: string): void;
}

alias Modified = reorderParameters(MyService.myOp, #["a", "missing"]);
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Parameter "missing" specified in reorder list not found in operation "myOp".
```

#### ✅ How to Fix

Remove the unknown name from the reorder list or add the parameter before reordering.
