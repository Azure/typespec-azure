---
title: "require-client-suffix"
---

```text title="Full name"
@azure-tools/typespec-client-generator-core/require-client-suffix
```

Verify that the generated client's name will have the suffix `Client` in its name

#### ❌ Incorrect

```ts
// main.tsp
namespace MyService;
```

```ts
// client.tsp
namespace MyCustomizations;

@@client(MyService);
```

#### ✅ Recommended

If you would not like to make any changes to the generated client besides its name, you can rely on the [`@clientName`][client-name] decorator to rename the main namespace of the service.

```ts
@@clientName(MyService, "MyClient");
```

#### ✅ Ok

If you are completely recreating a client namespace in your `client.tsp`, you can rely on that namespace to end in `Client`

```ts
// client.tsp
@client({service: MyService})
namespace MyClient {
}
```

### Links

[client-name]: https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/reference/decorators#@Azure.ClientGenerator.Core.clientName "@clientName Decorator"
