---
title: "no-private-usage"
---

```text title="Full name"
@azure-tools/typespec-azure-core/no-private-usage
```

Verify that a spec is not referencing items from another library using a private namespace.

#### ❌ Incorrect

```ts
@Azure.Core.Foundations.Private.embeddingVector(string)
model Foo {}
```

#### ✅ Ok

Using items from a private namespace within the same library is allowed.

```ts
namespace MyService;

@MyService.Private.myPrivateDecorator
model Foo {}


namespace Private {
  extern dec myPrivateDecorator(target);
}
```
