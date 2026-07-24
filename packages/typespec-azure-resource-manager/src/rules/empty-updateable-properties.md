Resources with update operations should have updateable properties. The RP-specific properties of the resource (as defined in the `properties` property) should have at least one updateable property. Properties are updateable if they do not have a `@visibility` decorator, or if they include `Lifecycle.Update` in the `@visibility` decorator arguments.

## Impact

- **Area:** API

Covered by the patch-specific rules; indicates the properties bag has no updateable properties.

## ❌ Incorrect

All properties are read-only:

```tsp
model FooResourceProperties {
  @visibility(Lifecycle.Read)
  bar?: string;
}
```

## ✅ Correct

At least one property without read-only visibility:

```tsp
model FooResourceProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: string;

  displayName?: string;
}
```

## Suppression

Suppress when required to match an existing API, or when using the Tags patch; otherwise ensure not all properties in the properties bag are updateable.
