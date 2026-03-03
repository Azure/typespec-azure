---
title: arm-resource-duplicate-property
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-duplicate-property
```

Warns when a property defined in the resource envelope is also defined in the resource-specific properties bag. Envelope properties should not be duplicated in the `properties` model.

#### ❌ Incorrect

```tsp
@armProviderNamespace
namespace MyService;

model FooResource is TrackedResource<FooProperties> {
  @key @segment("foo") name: string;
  ...ManagedServiceIdentityProperty;
}

model FooProperties {
  name: string; // duplicate of envelope "name"
  identity: string; // duplicate of envelope "identity"
}
```

#### ✅ Correct

```tsp
@armProviderNamespace
namespace MyService;

model FooResource is TrackedResource<FooProperties> {
  @key @segment("foo") name: string;
  ...ManagedServiceIdentityProperty;
}

model FooProperties {
  displayName?: string;
}
```
