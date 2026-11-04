The request body of a PATCH must be a model with a subset of the resource properties. The PATCH body must not contain properties that do not exist on the resource.

When a PUT shares the PATCH endpoint, the PATCH must have a nonempty object body whose writable JSON property names are present in PUT input. A nonempty PATCH body cannot correspond to an absent or void PUT body. Nested and inherited properties, encoded JSON names and each operation's request visibility are included. Unsupported or ambiguous body types are not treated as empty objects.

The check uses source models, not individual API-version shapes. Version-specific additions, removals, renames and type changes are not evaluated; version-dependent mismatches may therefore be missed or reported incorrectly. Shared version-aware lint evaluation is tracked in [#5875](https://github.com/Azure/typespec-azure/issues/5875).

The same resource model can expose a property to PATCH but hide it from PUT through `@parameterVisibility(Lifecycle.Create)`. Expose the property in PUT input as well, or remove it from PATCH input. The correspondence check also applies to custom HTTP operations.

## Impact

- **Area:** API

Inconsistent PATCH properties violate the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [ConsistentPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-patch-properties.md).

### Consolidated PATCH coverage

The checks formerly proposed as `patch-properties-correspond-to-put` are part of `arm-resource-patch`, not a separate rule to enable.

| Migrated lintdiff rule                                                                                                                                       | Coverage in this existing TypeSpec rule                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ConsistentPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-patch-properties.md)                                  | The existing resource checks require PATCH input to be a model whose properties are a subset of the resource, including the required tags behavior.                                                                                                                                                                             |
| [PatchPropertiesCorrespondToPutProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-properties-correspond-to-put-properties.md) | For authored PATCH and PUT operations at the same HTTP path, checks that PATCH has a nonempty object body and that its writable JSON leaf names correspond to PUT input in the source program. Includes nested and inherited properties, encoded names and request visibility; individual API-version shapes are not evaluated. |

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
