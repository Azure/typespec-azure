Envelope properties should not be duplicated in the `properties` model.

This rule compares properties-bag members with envelope property names on ARM
resource models, even without a PUT operation. It complements
[`no-repeated-path-info`](./no-repeated-path-info.md), which compares them with
HTTP path and query parameter names on PUT operations. For example, an envelope
`name` with `@key("widgetName")` makes `properties.widgetName` a URI duplication
only, while `properties.identity` duplicates an envelope `identity` even when
there is no URI parameter named `identity`. Neither rule replaces the other.

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
