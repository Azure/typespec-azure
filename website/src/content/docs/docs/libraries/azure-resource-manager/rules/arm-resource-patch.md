---
title: "arm-resource-patch"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-patch
```

Validate ARM PATCH operations. The request body of a PATCH must be a model with a subset of the resource properties. The PATCH body must not contain properties that do not exist on the resource.

This rule additionally validates the following:

- **Optional properties** (`requiredInPatch`): every property in a custom PATCH body model must be optional, so partial updates work as expected.
- **Visibility** (`notUpdateableInPatch`): properties present in a custom PATCH body model that map to resource properties without the `Update` lifecycle visibility cannot be updated and must be removed.
- **Merge-patch wire format** (`missingMergePatch`): every PATCH operation must use `@patch(#{ implicitOptionality: true })` (or be derived from one of the ARM `*PatchAsync`/`*PatchSync` templates) so that the generated wire format is `application/merge-patch+json`.
- **Content type** (`nonMergePatchContentType`): the explicit content-type on a PATCH operation must be `application/merge-patch+json` (or `application/json`, which is rewritten by the emitter under implicit optionality).

See also [`patch-envelope`](./patch-envelope.md), which validates the envelope properties surrounding the PATCH body.

#### ❌ Incorrect

```tsp
model FooResource is TrackedResource<FooProperties> {
  ...ResourceNameParameter<FooResource>;
}

model MyBadPatch {
  name?: string;
  ...Foundations.ArmTagsProperty;
  blah?: string; // does not exist on FooResource
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
