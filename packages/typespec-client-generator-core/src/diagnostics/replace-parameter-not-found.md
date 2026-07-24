This diagnostic is issued when `replaceParameter` is called with a selector that does not match any parameter on the operation.

## Impact

- **Area:** Client customization transformations. Blocks `replaceParameter` from producing the intended customized signature because the selector does not match an operation parameter.
- **Not affected:** The original operation signature is unchanged.

#### ❌ Incorrect Usage

```typespec
@service
namespace MyService {
  op myOp(existingParam: string): void;
}

model NewParams {
  replacement: int32;
}
alias Modified = replaceParameter(MyService.myOp, "missingParam", NewParams.replacement); // `missingParam` is not a parameter of `myOp`
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Parameter "missingParam" not found in operation "myOp".
```

#### ✅ How to Fix

Use the exact name or model property reference for an existing operation parameter.

```typespec
@service
namespace MyService {
  op myOp(existingParam: string): void;
}

model NewParams {
  replacement: int32;
}
alias Modified = replaceParameter(MyService.myOp, "existingParam", NewParams.replacement);
```
