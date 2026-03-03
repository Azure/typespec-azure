---
title: "arm-resource-patch"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-patch
```

Validate ARM PATCH operations. The request body of a PATCH must be a model with a subset of the resource properties. The PATCH body must not contain properties that do not exist on the resource.

#### ❌ Incorrect

```tsp
model FooResource is TrackedResource<FooProperties> {
  @key("foo")
  @segment("foo")
  @path
  name: string;
}

model MyBadPatch {
  blah?: string; // does not exist on FooResource
  blahdeeblah?: string; // does not exist on FooResource
}
```

#### ✅ Correct

```tsp
model FooResource is TrackedResource<FooProperties> {
  @key("foo")
  @segment("foo")
  @path
  name: string;
}

model FooPatch {
  ...Foundations.ArmTagsProperty;
  properties?: FooProperties;
}
```
