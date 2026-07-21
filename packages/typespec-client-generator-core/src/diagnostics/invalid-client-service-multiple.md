This diagnostic is issued when `@client` is applied to an interface with multiple services in the `service` option.

To fix this issue, move the multi-service `@client` declaration to a namespace, or use a single service for an interface client.

### Example

```typespec
using Azure.ClientGenerator.Core;

@service namespace ServiceA;
@service namespace ServiceB;

@client({ service: [ServiceA, ServiceB] })
interface CombinedClient {}
```

Multiple services are only allowed on namespace clients, so make `CombinedClient` a namespace or use one service.
