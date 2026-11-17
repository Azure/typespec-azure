Resource envelope properties must originate from the `Azure.ResourceManager` namespace. Custom properties that are not part of the standard ARM resource envelope should be placed in the resource-specific property bag instead.

## Impact

- **Area:** API

Defining non-standard top-level envelope properties violates the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [BodyTopLevelProperties](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r3006).

## ❌ Incorrect

```tsp
@armProviderNamespace
namespace MyService;

model FooResource is TrackedResource<{}> {
  ...ResourceNameParameter<FooResource>;
  disallowed?: string; // not valid in the resource envelope
}
```

## ✅ Correct

```tsp
@armProviderNamespace
namespace MyService;

model FooResource is TrackedResource<{}> {
  ...ResourceNameParameter<FooResource>;
  ...ManagedServiceIdentityProperty;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use the standard property mix-ins.

Place the suppression on a shared source property to suppress the violation for every resource that
copies the property through a template or model spread:

```tsp
model LegacyEnvelope {
  #suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property" "Matching legacy API"
  legacyEnvelopeValue?: string;
}
```

Place the suppression on a concrete resource to suppress only that resource while allowing the rule
to report other consumers of the same source property:

```tsp
model LegacyEnvelope {
  legacyEnvelopeValue?: string;
}

#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property" "Matching legacy API"
model FooResource is TrackedResource<FooProperties> {
  ...ResourceNameParameter<FooResource>;
  ...LegacyEnvelope;
}
```
