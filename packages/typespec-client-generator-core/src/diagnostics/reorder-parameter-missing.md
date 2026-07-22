This diagnostic is issued when `reorderParameters` omits a parameter that exists on the operation.

To fix this issue, include every operation parameter exactly once in the reorder list.

### Example

```typespec
@service
namespace MyService {
  op myOp(a: string, b: string, c: string): void;
}

#suppress "experimental-feature" "customizing generated parameters"
alias Modified = reorderParameters(MyService.myOp, #["c", "a"]);
```

Include every operation parameter exactly once, for example `#["c", "a", "b"]`.
