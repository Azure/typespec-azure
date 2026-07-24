Reserved names are used by the ARM platform and common types; declaring them in RP-specific properties can conflict with standardized behavior.

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
