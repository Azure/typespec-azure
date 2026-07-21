This diagnostic is issued when a required HTTP parameter is scoped out of the current emitter with `@scope`, leaving the operation without a value it needs. This is usually not allowed.

To fix this issue, keep the required parameter in scope, or — when scoping it out is intentional and the value is supplied another way — confirm the intent and suppress this diagnostic.

### Example

```typespec
using TypeSpec.Http;
using Azure.ClientGenerator.Core;

op getWidget(
  @header("x-client-id")
  @scope("!python")
  clientId: string,
): void;
```

When generating for Python, the required `clientId` header is scoped out; keep it in scope, or confirm the intent and suppress the diagnostic if the value is supplied another way.
