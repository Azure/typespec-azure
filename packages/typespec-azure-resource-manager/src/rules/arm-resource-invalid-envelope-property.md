Resource envelope properties must originate from the `Azure.ResourceManager` namespace. Custom properties that are not part of the standard ARM resource envelope should be placed in the resource-specific property bag instead.

#### ❌ Incorrect

```tsp
@armProviderNamespace
namespace MyService;

model FooResource is TrackedResource<{}> {
  ...ResourceNameParameter<FooResource>;
  disallowed?: string; // not valid in the resource envelope
}
```

#### ✅ Correct

```tsp
@armProviderNamespace
namespace MyService;

model FooResource is TrackedResource<{}> {
  ...ResourceNameParameter<FooResource>;
  ...ManagedServiceIdentityProperty;
}
```
