---
title: "arm-resource-patch"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-patch
```

Validate ARM PATCH operations. The request body of a PATCH must be a model with a subset of the resource properties. The PATCH body must not contain properties that do not exist on the resource. In addition, the rule validates that:

- All properties in the PATCH request body are optional (PATCH supports partial updates), unless their source resource property has visibility `{Lifecycle.Read}` by itself (in which case they are filtered out of the request body by visibility transforms).
- No PATCH request body property has a default value (a property absent from a PATCH request leaves the existing value unchanged; defaults are not applied).
- Every PATCH request body property maps back to a resource property whose visibility either includes `Lifecycle.Update` (this includes default visibility, `@visibility(Lifecycle.Update)` alone, or any combination of `Lifecycle.Update` with other lifecycle modifiers) or includes `Lifecycle.Read` but not `Lifecycle.Create`. Visibilities like `@visibility(Lifecycle.Create)` or `@visibility(Lifecycle.Create, Lifecycle.Read)` are not allowed. The check is applied recursively to nested model and `Record<Model>` property types.
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
