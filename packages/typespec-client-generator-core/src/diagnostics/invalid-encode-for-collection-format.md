This diagnostic is issued when an array parameter uses `@encode` with an array encoding other than `ArrayEncoding.pipeDelimited` or `ArrayEncoding.spaceDelimited` for collection format.

To fix this issue, use `ArrayEncoding.pipeDelimited`, use `ArrayEncoding.spaceDelimited`, rely on the default CSV format, or use exploded query serialization.

### Example

```typespec
using TypeSpec.Http;

@service
namespace My.Service;

op myOp(@header @encode("tsv") header: string[]): void;
```

`tsv` is not one of the supported collection encodings; use `ArrayEncoding.pipeDelimited`, `ArrayEncoding.spaceDelimited`, or the default CSV behavior.
