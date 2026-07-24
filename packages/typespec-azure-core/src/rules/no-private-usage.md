Verify that a spec is not referencing items from another library using a private namespace.

## Impact

- **Area:** API, SDK

Using private or internal declarations risks a spec break when they change.

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

## Suppression

Suppress only when required to match an existing API; otherwise use the standard types and templates.
