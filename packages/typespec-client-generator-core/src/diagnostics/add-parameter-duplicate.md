This diagnostic is issued when `addParameter` is called with a model property whose name already exists on the operation.

To fix this issue, choose a unique parameter name or use `replaceParameter` when the intent is to replace an existing parameter.

### Example

```typespec
@service
namespace MyService {
  op myOp(name: string): void;
}

model ExtraParams {
  name: string;
}
alias Modified = addParameter(MyService.myOp, ExtraParams.name);
```

Use a unique parameter name or call `replaceParameter` when replacing `name`.
