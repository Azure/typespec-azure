This diagnostic is issued when `reorderParameters` lists the same parameter name more than once.

To fix this issue, include each parameter exactly once in the reorder list.

### Example

```typespec
using Azure.ClientGenerator.Core;

@service
namespace MyService {
  op myOp(a: string, b: string): void;
}

#suppress "experimental-feature" "customizing generated parameters"
alias Modified = reorderParameters(MyService.myOp, #["a", "a"]);
```

List each parameter exactly once, such as `#["a", "b"]`.
