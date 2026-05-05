---
title: "arm-resource-patch"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-patch
```

Validate ARM PATCH operations. The request body of a PATCH must be a model with a subset of the resource properties. The PATCH body must not contain properties that do not exist on the resource. In addition, the rule validates that:

- All properties in the PATCH request body are optional (PATCH supports partial updates).
- No PATCH request body property has a default value (a property absent from a PATCH request leaves the existing value unchanged; defaults are not applied).
- No PATCH request body property maps back to a resource property that is not updateable (for example, `@visibility(Lifecycle.Create)`). Properties that are purely read-only (`@visibility(Lifecycle.Read)`) are allowed because they are filtered out by visibility transforms when the request body is serialized.
- The `content-type` header (when explicitly specified) is `application/merge-patch+json` (or the implicit `application/json`).

#### ❌ Incorrect

```tsp
model FooResource is TrackedResource<FooProperties> {
  ...ResourceNameParameter<FooResource>;
}

model MyBadPatch {
  name?: string;
  ...Foundations.ArmTagsProperty;
  blah?: string; // does not exist on FooResource
  required: string; // not optional
  withDefault?: string = "x"; // has a default value
}
```

#### ✅ Correct

```tsp
model FooResource is TrackedResource<FooProperties> {
  ...ResourceNameParameter<FooResource>;
}

model FooPatch {
  name?: string;
  ...Foundations.ArmTagsProperty;
  properties?: FooProperties;
}
```
