This diagnostic is issued when a nested `@client` specifies services that are not a subset of the parent client's services.

To fix this issue, restrict the nested client's `service` option to parent services, or omit the option to inherit from the parent.

### Example

```typespec
using Azure.ClientGenerator.Core;

@service namespace ParentService;
@service namespace OtherService;

@client({ service: ParentService })
namespace ParentClient {
  @client({ service: OtherService })
  namespace ChildClient {}
}
```

`OtherService` is not part of the parent client; omit the nested `service` option or use a parent service.
