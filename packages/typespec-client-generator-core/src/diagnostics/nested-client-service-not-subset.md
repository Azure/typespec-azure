This diagnostic is issued when a nested (sub) client declares services that are not a subset of its parent client's services. A sub client can only expose services that its parent client already exposes.

To fix this issue, restrict the nested client's `service` to services the parent client already declares, or omit the `service` option to inherit the parent's services.

### Example

Instead of referencing a service the parent client does not include:

```typespec
using Azure.ClientGenerator.Core;

@client({
  name: "ParentClient",
  service: [ServiceOne, ServiceTwo],
})
namespace ParentClient {
  @client({
    name: "ChildClient",
    service: ServiceThree,
  })
  namespace Child {

  }
}
```

Use a subset of the parent's services (or omit `service` to inherit them):

```typespec
@client({
  name: "ParentClient",
  service: [ServiceOne, ServiceTwo],
})
namespace ParentClient {
  @client({
    name: "ChildClient",
    service: ServiceOne,
  })
  namespace Child {

  }
}
```
