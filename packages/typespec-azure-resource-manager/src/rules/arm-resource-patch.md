The request body of a PATCH must be a model with a subset of the resource properties. The PATCH body must not contain properties that do not exist on the resource.

When a PUT shares the PATCH endpoint, the PATCH must have a nonempty object body whose effective input properties correspond to PUT input properties. This includes recursive models, inherited properties, encoded JSON names, native operation visibility, and every declared service/dependency version. Unsupported or ambiguous body types are not treated as empty objects.

`arm-resource-operation-response` checks PUT request/resource and response consistency; `use-operation-decorator` checks resource operation registration. Resource subset and model identity alone are insufficient: the same resource model can expose a property to PATCH but hide it from PUT through `@parameterVisibility(Lifecycle.Create)`. Therefore `arm-resource-patch` also checks effective writable input at paired endpoints, including custom HTTP operations.

## Impact

- **Area:** API

Inconsistent PATCH properties violate the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [ConsistentPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-patch-properties.md).

### Consolidated PATCH coverage

The checks formerly proposed as `patch-properties-correspond-to-put` are part of `arm-resource-patch`, not a separate rule to enable.

| Migrated lintdiff rule                                                                                                                                       | Coverage in this existing TypeSpec rule                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ConsistentPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-patch-properties.md)                                  | The existing resource checks require PATCH input to be a model whose properties are a subset of the resource, including the required tags behavior.                                                                                                                                                                                            |
| [PatchPropertiesCorrespondToPutProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-properties-correspond-to-put-properties.md) | For authored PATCH and PUT operations at the same HTTP path, checks that PATCH has a nonempty object body and that its effective writable JSON leaf names correspond to PUT input at each resolved service/dependency version. Traversal includes nested models, inherited properties, encoded names, and each operation's request visibility. |

The paired-endpoint check also applies to custom HTTP operations. Without a matching PUT, only the applicable existing resource checks run. Unsupported body shapes are skipped rather than interpreted as empty objects.

`arm-resource-operation-response` and `use-operation-decorator` provide complementary identity and registration checks, not a substitute for writable-input correspondence. For example, a shared resource property visible to PATCH can be hidden from PUT by `@parameterVisibility(Lifecycle.Create)`. That case still requires the paired-body check, even when both operations refer to the same registered resource.

These are native source/model checks, not an inspection of emitted Swagger schemas. Use `ArmResourceCreateOrReplaceSync<Resource>` with `ArmCustomPatchSync<Resource, PatchModel = ResourcePatch>` and expose only writable resource properties in `ResourcePatch`.

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
