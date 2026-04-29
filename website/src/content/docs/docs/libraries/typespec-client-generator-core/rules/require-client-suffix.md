---
title: require-client-suffix
---

```text title="Full name"
@azure-tools/typespec-client-generator-core/require-client-suffix
```

Top-level client names should end with the `Client` suffix. This convention
makes it clear that a namespace or interface represents a generated SDK
client and provides a consistent experience across emitted languages.

If the underlying TypeSpec name does not end with `Client`, use the
`@client` decorator to provide a client-friendly name.

#### ❌ Incorrect

```tsp
@client
namespace MyService;
```

#### ✅ Correct

```tsp
@client
namespace MyServiceClient;
```

#### ✅ Correct (renamed via `@client`)

```tsp
@client({ name: "MyServiceClient" })
namespace MyService;
```
