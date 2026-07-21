This diagnostic is issued when a required HTTP parameter is excluded from the current emitter by `@scope`.

To fix this issue, keep required parameters in scope, make the parameter optional when appropriate, or provide it through another reliable mechanism such as a custom header policy.

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

When generating for Python, the required `clientId` header is scoped out; keep it in scope, make it optional, or supply it another way.
