---
title: no-billing-data-in-properties-bag
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/no-billing-data-in-properties-bag
```

A property named `BillingData` must not be present in a resource's property bag (the model referenced by the `properties` property of an ARM resource). The name is reserved for platform billing integration and is being standardized through Common Types, so it must not be declared by resource providers. The property name is matched case-insensitively (`BillingData`, `billingData`, `billingdata`, etc.) and is disallowed regardless of its type (named model reference, inline model, or primitive).

#### ❌ Incorrect

```tsp
@armProviderNamespace
namespace MyService;

model FooResource is TrackedResource<FooProperties> {
  @key @segment("foo") name: string;
}

model FooProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;

  billingData?: string; // "BillingData" is reserved and not allowed in the property bag
}
```

#### ✅ Correct

```tsp
@armProviderNamespace
namespace MyService;

model FooResource is TrackedResource<FooProperties> {
  @key @segment("foo") name: string;
}

model FooProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;

  billingInfo?: string;
}
```
