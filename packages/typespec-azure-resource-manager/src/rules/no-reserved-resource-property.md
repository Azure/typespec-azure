Certain property names are reserved and must not be present in a resource's property bag (the model referenced by the `properties` property of an ARM resource). For example, `billingData` is reserved for platform billing integration and is being standardized through Common Types, so resource providers must not declare it.

The property name is matched case-insensitively (`billingData`, `BillingData`, `billingdata`, etc.) and is disallowed regardless of its type (named model reference, inline model, or primitive). The set of reserved names is maintained by the rule.

## ❌ Incorrect

```tsp
@armProviderNamespace
namespace MyService;

model FooResource is TrackedResource<FooProperties> {
  @key @segment("foo") name: string;
}

model FooProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;

  billingData?: string; // "billingData" is reserved and not allowed in the property bag
}
```

## ✅ Correct

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
