Tenant and Extension resources should not define a list by subscription operation. These resource types are not scoped to a subscription, so listing them by subscription is not appropriate.

## Impact

- **Area:** API

Likely a modeling error - only subscription-based resources should have subscription list operations.

## ❌ Incorrect

```tsp
@tenantResource
model FooResource is ProxyResource<FooProperties> {
  ...ResourceNameParameter<FooResource>;
}

@armResourceOperations(FooResource)
interface FooResources {
  listBySubscription is ArmListBySubscription<FooResource>;
}
```

## ✅ Correct

```tsp
@tenantResource
model FooResource is ProxyResource<FooProperties> {
  ...ResourceNameParameter<FooResource>;
}

@armResourceOperations(FooResource)
interface FooResources {
  get is ArmResourceRead<FooResource>;
}
```

## Suppression

Suppress per the RPC guidelines. Ensure tenant resources have only a tenant list, and use the standard resource operations.
