Envelope properties should not be duplicated in the `properties` model.

## Impact

- **Area:** API, SDK

Reusing an envelope property name inside the RP-specific property bag violates the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [ArmResourcePropertiesBag](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r3019).

## ❌ Incorrect

```tsp
@armProviderNamespace
namespace MyService;

model FooResource is TrackedResource<FooProperties> {
  ...ResourceNameParameter<FooResource>;
  ...ManagedServiceIdentityProperty;
}

model FooProperties {
  name: string; // duplicate of envelope "name"
  identity: string; // duplicate of envelope "identity"
}
```

## ✅ Correct

```tsp
@armProviderNamespace
namespace MyService;

model FooResource is TrackedResource<FooProperties> {
  ...ResourceNameParameter<FooResource>;
  ...ManagedServiceIdentityProperty;
}

model FooProperties {
  displayName?: string;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise do not reuse envelope property names in the rp-specific property bag.
