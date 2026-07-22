This diagnostic is issued when multiple services merged into one `@client` declaration do not have the same server and authentication definitions.

To fix this issue, make the merged services use matching server and auth definitions, or generate them as separate clients.

### Example

```typespec
using Azure.ClientGenerator.Core;

@service
@server("https://servicea.example.com")
namespace ServiceA {

}

@service
@server("https://serviceb.example.com")
namespace ServiceB {

}

@client({
  name: "CombineClient",
  service: [ServiceA, ServiceB],
  autoMergeService: true,
})
namespace CombineClient {

}
```

`ServiceA` and `ServiceB` have different server definitions, so they cannot be merged into one client until the server definitions match.
