---
title: arm-resource-duplicate-property
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-duplicate-property
```

Warns when a property defined in the resource envelope is also defined in the resource-specific properties bag. Envelope properties should not be duplicated in the `properties` model.

#### ❌ Incorrect

```tsp
model MyResource is TrackedResource<MyResourceProperties> {
  @key("myResourceName")
  @segment("myResources")
  @path
  name: string;
}

model MyResourceProperties {
  name: string; // duplicate of envelope property
  description?: string;
}
```

#### ✅ Correct

```tsp
model MyResource is TrackedResource<MyResourceProperties> {
  @key("myResourceName")
  @segment("myResources")
  @path
  name: string;
}

model MyResourceProperties {
  description?: string;
  displayName?: string;
}
```
