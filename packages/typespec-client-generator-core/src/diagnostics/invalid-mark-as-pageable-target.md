This diagnostic is issued when `@markAsPageable` is applied to an operation that does not return a model with a property decorated with `@pageItems` or named `value`.

To fix this issue, apply `@markAsPageable` only to operations returning a suitable page model, or update the response model to include `@pageItems` or a `value` property.

### Example

```typespec
using TypeSpec.Http;
using Azure.ClientGenerator.Core.Legacy;

@markAsPageable
@get
op listWidgets(): string;
```

The operation does not return a page model; return a model with `@pageItems` or a `value` property, or remove `@markAsPageable`.
