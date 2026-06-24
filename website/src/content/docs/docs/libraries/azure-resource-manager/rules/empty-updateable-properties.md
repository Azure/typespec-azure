---
title: "empty-updateable-properties"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/empty-updateable-properties
```

Resources with update operations should have updateable properties. The RP-specific properties of the resource (as defined in the `properties` property) should have at least one updateable property. Properties are updateable if they do not have a `@visibility` decorator, or if they include `Lifecycle.Update` in the `@visibility` decorator arguments.

#### ❌ Incorrect

All properties are read-only:

```tsp
model FooResourceProperties {
  @visibility(Lifecycle.Read)
  bar?: string;
}
```

#### ✅ Correct

At least one property without read-only visibility:

```tsp
model FooResourceProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: string;

  displayName?: string;
}
```
