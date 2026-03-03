---
title: "improper-subscription-list-operation"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/improper-subscription-list-operation
```

Tenant and Extension resources should not define a list by subscription operation. These resource types are not scoped to a subscription, so listing them by subscription is not appropriate.

#### ❌ Incorrect

```tsp
@tenantResource
model FooResource is ProxyResource<FooProperties> {
  @key("foo")
  @segment("foo")
  @path
  name: string;
}

@armResourceOperations(FooResource)
interface FooResources {
  op listBySubscription is ArmListBySubscription<FooResource>;
}
```

#### ✅ Correct

```tsp
@tenantResource
model FooResource is ProxyResource<FooProperties> {
  @key("foo")
  @segment("foo")
  @path
  name: string;
}

@armResourceOperations(FooResource)
interface FooResources {
  get is ArmResourceRead<FooResource>;
}
```
