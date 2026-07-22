This diagnostic is issued when a value from an example file cannot be matched to the TypeSpec definition.

To fix this issue, update the example value or the TypeSpec definition so parameters, request bodies, and responses follow the declared shapes.

### Example

```typespec
using TypeSpec.Http;

@service
namespace TestClient {
  @route("/{b}")
  op parametersDiagnostic(
    @header a: string,
    @path b: string,
    @query c: string,
    @body d: string,
  ): void;
}
```

The test example file for `parametersDiagnostic` contains a parameter named `test`, which does not map to any declared header, path, query, or body parameter.
