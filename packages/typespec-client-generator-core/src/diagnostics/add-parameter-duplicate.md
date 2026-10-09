This diagnostic is issued when `addParameter` is called with a model property whose name already exists on the operation.

## Impact

- **Area:** Client customization transformations. Blocks `addParameter` from producing a valid customized SDK method signature when the added parameter name already exists.
- **Not affected:** The original service operation remains unchanged.

## ❌ Incorrect Usage

```typespec
@service
namespace MyService {
  op myOp(name: string): void;
}

model ExtraParams {
  name: string; // duplicates existing parameter `name` on `myOp`
}
alias Modified = addParameter(MyService.myOp, ExtraParams.name);
```

## Diagnostic Message

TCGC reports:

```text
Parameter "name" already exists in operation "myOp".
```

## ✅ How to Fix

Choose a unique parameter name or use `replaceParameter` when the intent is to replace an existing parameter.

```typespec
@service
namespace MyService {
  op myOp(name: string): void;
}

model ExtraParams {
  description: string;
}
alias Modified = addParameter(MyService.myOp, ExtraParams.description);
```
