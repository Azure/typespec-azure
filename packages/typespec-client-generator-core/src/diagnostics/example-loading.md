This diagnostic is issued when TCGC skips loading examples because the examples directory cannot be read, an example file cannot be parsed, or required `operationId` or `title` metadata is missing.

To fix this issue, ensure the configured examples directory exists and every example JSON file is valid and includes both `operationId` and `title`.

### Example

```typespec
@service
namespace TestClient {
  op get(): string;
}
```

In the test, TCGC is run with `examples-dir` set to `./examples`, but that directory does not exist, so example loading is skipped for the service.
