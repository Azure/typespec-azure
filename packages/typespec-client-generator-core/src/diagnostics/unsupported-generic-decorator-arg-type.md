This diagnostic is issued when TCGC tries to parse a generic decorator argument whose TypeSpec kind is unsupported.

To fix this issue, use supported decorator argument values such as strings, numbers, booleans, values, or enum members.

### Example

The test that exercises this diagnostic compiles a service and asks TCGC to include the generic `TypeSpec.@service` decorator in emitted decorator metadata:

```typespec
@service
namespace TestService {
  op test(): void;
}
```

The unsupported argument shape is encountered while parsing that decorator metadata; avoid exposing generic decorator arguments that TCGC cannot convert to SDK decorator metadata.
