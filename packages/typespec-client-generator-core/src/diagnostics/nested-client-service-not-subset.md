This diagnostic is issued when a nested (sub) client declares services that are not a subset of its parent client's services. A sub client can only expose services that its parent client already exposes.

## Impact

- **Area:** Nested client service ownership. Blocks a sub-client from exposing services that its parent client does not own.
- **Not affected:** The parent client's declared services and the standalone service namespaces remain unchanged.

#### ❌ Incorrect Usage

```typespec
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

#### Diagnostic Message

For the declaration above, TCGC reports:

```text
Nested client's services must be a subset of the parent client's services. If no service is needed, omit the `service` property to inherit from the parent.
```

#### ✅ How to Fix

Restrict the nested client's `service` to services the parent client already declares, or omit the `service` option to inherit the parent's services:

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
