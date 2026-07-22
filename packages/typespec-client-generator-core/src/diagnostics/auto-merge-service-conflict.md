This diagnostic is issued when a parent client uses `autoMergeService` and a nested client also specifies its own service configuration.

To fix this issue, leave the nested client's `service` option unset so it inherits from the parent, or remove the parent `autoMergeService` setup.

### Example

```typespec
using Azure.ClientGenerator.Core;

@service
namespace ServiceA {
  @route("/aTest")
  op opA(): void;
}

@service
namespace ServiceB {
  @route("/bTest")
  op opB(): void;
}

@client({
  name: "ParentClient",
  service: [ServiceA, ServiceB],
  autoMergeService: true,
})
namespace ParentClient {
  @client({
    name: "ChildClient",
    service: ServiceA,
  })
  namespace Child {

  }
}
```

The parent client is auto-merging services while the child declares its own service; omit the child `service` option or remove `autoMergeService`.
