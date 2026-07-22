This diagnostic is issued when `replaceParameter` is called with a selector that does not match any parameter on the operation.

To fix this issue, use the exact name or model property reference for an existing operation parameter.

### Example

```typespec
@service
namespace MyService {
  op myOp(existingParam: string): void;
}

model NewParams {
  replacement: int32;
}
#suppress "experimental-feature" "customizing generated parameters"
alias Modified = replaceParameter(MyService.myOp, "missingParam", NewParams.replacement);
```

Use the exact name of an existing parameter, such as `"existingParam"`.
