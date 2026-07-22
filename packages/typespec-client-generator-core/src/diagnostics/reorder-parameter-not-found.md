This diagnostic is issued when `reorderParameters` includes a parameter name that does not exist on the operation.

To fix this issue, remove the unknown name from the reorder list or add the parameter before reordering.

### Example

```typespec
@service
namespace MyService {
  op myOp(a: string, b: string): void;
}

#suppress "experimental-feature" "customizing generated parameters"
alias Modified = reorderParameters(MyService.myOp, #["a", "missing"]);
```

Remove unknown names from the reorder list or add the parameter before reordering.
