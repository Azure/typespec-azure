---
title: "arm-resource-path-segment-invalid-chars"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-path-segment-invalid-chars
```

ARM resource path segments must contain only alphanumeric characters or dashes, starting with a lowercase letter.

#### ❌ Incorrect

```tsp
model FooResource is TrackedResource<{}> {
  ...ResourceNameParameter<FooResource, SegmentName = "/foo/bar">;
}
```

#### ✅ Correct

```tsp
model FooResource is TrackedResource<{}> {
  ...ResourceNameParameter<FooResource>;
}
```
