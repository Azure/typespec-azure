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
  ...ResourceNameParameter<Foo>;
  ...ManagedServiceIdentityProperty;
}

model PatchFoo {
  properties?: PatchFooProperties;
}

model PatchFooProperties {
  name?: string;
}

@armResourceOperations
interface FooResources {
  // update model is missing the 'identity' envelope property
  update is ArmCustomPatchAsync<FooResource, PatchFoo>;
}
```

#### ✅ Correct

```tsp
model FooResource is TrackedResource<FooProperties> {
  ...ResourceNameParameter<Foo>;
  ...ManagedServiceIdentityProperty;
}

model PatchFoo {
  ...ManagedServiceIdentityProperty;
  properties?: PatchFooProperties;
}

model PatchFooProperties {
  name?: string;
}

@armResourceOperations
interface FooResources {
  update is ArmCustomPatchAsync<FooResource, PatchFoo>;
}
```
