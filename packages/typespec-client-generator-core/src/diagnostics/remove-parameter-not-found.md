This diagnostic is issued when `removeParameter` is called with a selector that does not match any parameter on the operation.

## Impact

- **Area:** Client customization transformations. Blocks `removeParameter` from producing the intended customized signature because the selector does not match an operation parameter.
- **Not affected:** The original operation parameter list is unchanged.

#### ❌ Incorrect Usage

```typespec
@service
namespace MyService {
  op myOp(existingParam?: string): void;
}

alias Modified = removeParameter(MyService.myOp, "missingParam"); // ❌ `missingParam` is not a parameter of `myOp`
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Parameter "missingParam" not found in operation "myOp".
```

#### ✅ How to Fix

Use the exact name or model property reference for an existing operation parameter.
