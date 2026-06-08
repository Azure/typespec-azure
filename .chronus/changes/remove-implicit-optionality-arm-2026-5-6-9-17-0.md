---
changeKind: breaking
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Removed `implicitOptionality: true` from the `@patch` decorator on the following operation templates:

- `ArmTagsPatchAsync`
- `ArmResourcePatchAsync`
- `ArmTagsPatchSync`
- `ArmResourcePatchSync`
- `ResourceUpdateSync.update` (in `ResourceUpdateSync` interface)

Previously, these templates used `@patch(#{ implicitOptionality: true })` which caused all properties in the PATCH request body to be implicitly treated as optional, regardless of how they were declared in the model. This behavior is now removed — properties will retain their declared optionality.

#### Migration

If you use these ARM operation templates, the PATCH body will no longer implicitly make all properties optional. In most cases, ARM resources already use `ResourceUpdateModel<Resource, Properties>` which produces the correct optional property envelope — if so, **no changes are needed**.

If you have a custom patch body that relied on implicit optionality, explicitly mark properties as optional:

**Before** (implicit optionality made all properties optional automatically):

```tsp
model MyResourceProperties {
  displayName: string;
  config: MyConfig;
}
```

**After** (explicitly declare optional properties for update):

```tsp
model MyResourceUpdateProperties {
  displayName?: string;
  config?: MyConfig;
}
```

Or continue using `ResourceUpdateModel<Resource, Properties>` which already handles this transformation for standard ARM resource patterns.
