---
title: "patch-envelope"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/patch-envelope
```

Patch envelope properties should match the resource properties. If a resource defines envelope properties such as `identity`, `managedBy`, `plan`, `sku`, or `tags`, these properties must also be present in the PATCH request body so they can be updated.

#### ❌ Incorrect

```tsp
model FooResource is TrackedResource<FooProperties> {
  @key("foo") @segment("foo") @path name: string;
  ...ManagedServiceIdentityProperty;
}

@armResourceOperations
interface FooResources {
  // update model is missing the 'identity' envelope property
  update is ArmResourcePatchSync<FooResource, FooProperties>;
}
```

#### ✅ Correct

```tsp
model FooResource is TrackedResource<FooProperties> {
  @key("foo") @segment("foo") @path name: string;
  ...ManagedServiceIdentityProperty;
}

model FooPatch {
  ...ManagedServiceIdentityProperty;
  properties?: FooProperties;
}

@armResourceOperations
interface FooResources {
  update is ArmResourcePatchSync<FooResource, FooPatch>;
}
```
