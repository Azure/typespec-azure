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
import "@azure-tools/typespec-client-generator-core";
import "./main.tsp";

using Azure.ClientGenerator.Core;

namespace MyCustomizations;

@@client(MyService);
```

#### ✅ Ok

Either you can rename the client using input param `{"name": "MyClient"}`, or if you are completely recreating a client namespace in your `client.tsp`, you can rely on that namespace to end in `Client`

```ts
// client.tsp
import "@azure-tools/typespec-client-generator-core";
import "./main.tsp";

using Azure.ClientGenerator.Core;

@client({service: MyService})
namespace MyClient {
}
```
