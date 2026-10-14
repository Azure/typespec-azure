The request body of a PATCH must be a model with a subset of the resource properties. The PATCH body must not contain properties that do not exist on the resource.

When a PUT shares the PATCH endpoint, the PATCH must have a nonempty object body whose effective input properties correspond to PUT input properties. This includes recursive models, inherited properties, encoded JSON names, native operation visibility, and every declared service/dependency version. Unsupported or ambiguous body types are not treated as empty objects.

`arm-resource-operation-response` checks PUT request/resource and response consistency; `use-operation-decorator` checks resource operation registration. Resource subset and model identity alone are insufficient: the same resource model can expose a property to PATCH but hide it from PUT through `@parameterVisibility(Lifecycle.Create)`. Therefore `arm-resource-patch` also checks effective writable input at paired endpoints, including custom HTTP operations.

## Impact

- **Area:** API

Inconsistent PATCH properties violate the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [ConsistentPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-patch-properties.md).

Together with the resource operation/body rules above, it also covers [PatchPropertiesCorrespondToPutProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-properties-correspond-to-put-properties.md). Use `ArmResourceCreateOrReplaceSync<Resource>` with `ArmCustomPatchSync<Resource, PatchModel = ResourcePatch>` and expose only writable resource properties in `ResourcePatch`.

## ❌ Incorrect

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

## ✅ Correct

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

## Suppression

Suppress per the RPC guidelines; otherwise use the standard PATCH operations.
