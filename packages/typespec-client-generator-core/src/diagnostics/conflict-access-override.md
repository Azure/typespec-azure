This diagnostic is issued when an `@access` override conflicts with access already calculated from an operation or another `@access` override.

To fix this issue, align access settings so each generated type has one consistent access level, or remove the conflicting override.

### Example

```typespec
using TypeSpec.Http;
using Azure.ClientGenerator.Core;

@access(Access.internal)
model A {}

op test(@body body: A): void;
```

The operation exposes `A` publicly while `@access(Access.internal)` tries to hide it; align the operation and model access settings.
