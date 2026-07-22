This diagnostic is issued when a parent client uses `autoMergeService` and a nested client also specifies its own service configuration.

## Impact

- **Area:** Multi-service client hierarchy. Blocks an auto-merged parent client from also containing a nested client with its own explicit service binding.
- **Not affected:** The underlying service namespaces and routes remain valid independently.

#### ❌ Incorrect Usage

```typespec
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
    service: ServiceA, // conflicts with the parent's autoMergeService
  })
  namespace Child {

  }
}
```

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Auto-merging service client must be empty.
```

#### ✅ How to Fix

Leave the nested client's `service` option unset so it inherits from the parent, or remove the parent `autoMergeService` setup.
