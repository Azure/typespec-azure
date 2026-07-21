This diagnostic is issued when `removeParameter` is called with a selector that does not match any parameter on the operation.

To fix this issue, use the exact name or model property reference for an existing operation parameter.

### Example

```typespec
using Azure.ClientGenerator.Core;

@service
namespace MyService {
  op myOp(existingParam?: string): void;
}

#suppress "experimental-feature" "customizing generated parameters"
alias Modified = removeParameter(MyService.myOp, "missingParam");
```

Use the exact name of an existing parameter, such as `"existingParam"`.
