The request body of a PATCH must be a model with a subset of the resource properties. The PATCH body must not contain properties that do not exist on the resource.

When a PUT shares the PATCH endpoint, the PATCH must have a nonempty object body whose writable JSON properties correspond to PUT input. Matching properties must preserve PUT's directly declared format and bounds. For example, a PATCH must not omit a string-length limit required by PUT.

The comparison checks formats, string lengths, item counts and numeric bounds declared on the property or inherited from its type. PATCH may omit required PUT properties, make properties optional and use stricter bounds. For a nullable property, the non-null value is checked. Descriptions and default values need not match.

This is not a general type-compatibility check. Scalar type differences, enum values, scalar encodings and array/dictionary contents are not compared. Bounds of multi-type unions and enum value sets are not inferred, nor are the intrinsic ranges of different numeric types. A clean lint result does not prove that every PATCH value is accepted by PUT.

Nested and inherited properties, encoded JSON names and each operation's request visibility are included. Operations inherited into project interfaces are also checked, with library-defined findings targeted at the project interface. A shared resource property hidden from PUT input by `@parameterVisibility(Lifecycle.Create)` cannot satisfy PATCH correspondence. Expose it in PUT input or remove it from PATCH input. A nonempty PATCH body cannot correspond to an absent or void PUT body. Unsupported or ambiguous body types are not treated as empty objects.

An object whose children are not writable in PATCH is matched with the PUT property at the same JSON payload position. Its container must still be valid PUT input; an unrelated same-named property does not satisfy this check.

The check uses source models, not individual API-version shapes. Version-specific additions, removals, renames and type changes are not evaluated; version-dependent mismatches may therefore be missed or reported incorrectly. Shared version-aware lint evaluation is tracked in [#5875](https://github.com/Azure/typespec-azure/issues/5875).

## Impact

- **Area:** API

Inconsistent PATCH properties violate the RPC contract.

## ❌ Incorrect

`displayName` omits the resource property's maximum length.

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using Azure.ResourceManager;

@service
@armProviderNamespace
namespace Contoso.Widgets;

model WidgetProperties {
  @maxLength(256)
  displayName?: string;

  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

model WidgetPatchProperties {
  displayName?: string;
}

model WidgetPatch {
  tags?: Record<string>;
  properties?: WidgetPatchProperties;
}

@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
  update is ArmCustomPatchSync<Widget, PatchModel = WidgetPatch>;
}
```

## ✅ Correct

Preserve the resource property's maximum length on `displayName`.

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using Azure.ResourceManager;

@service
@armProviderNamespace
namespace Contoso.Widgets;

model WidgetProperties {
  @maxLength(256)
  displayName?: string;

  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

model WidgetPatchProperties {
  @maxLength(256)
  displayName?: string;
}

model WidgetPatch {
  tags?: Record<string>;
  properties?: WidgetPatchProperties;
}

@armResourceOperations
interface Widgets {
  createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
  update is ArmCustomPatchSync<Widget, PatchModel = WidgetPatch>;
}
```

## Suppression

Suppress per the RPC guidelines; otherwise use the standard PATCH operations.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [ConsistentPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-patch-properties.md).

### Consolidated PATCH coverage

The checks formerly proposed as `patch-properties-correspond-to-put` are part of `arm-resource-patch`, not a separate rule to enable.

| Migrated lintdiff rule                                                                                                                                       | Coverage in this existing TypeSpec rule                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ConsistentPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-patch-properties.md)                                  | The existing resource checks require PATCH input to be a model whose properties are a subset of the resource, including the required tags behavior.                                                                                                                                                                                                                        |
| [PatchPropertiesCorrespondToPutProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-properties-correspond-to-put-properties.md) | For project PATCH and PUT operations at the same HTTP path, including inherited operations, checks nonempty PATCH input, writable JSON leaf correspondence and direct formats and bounds. Includes nested/inherited properties, encoded names and request visibility; general type compatibility, collection contents and individual API-version shapes are not evaluated. |

The paired-endpoint check also applies to custom HTTP operations. Without a matching PUT, only the applicable existing resource checks run. Unsupported body shapes are skipped rather than interpreted as empty objects.

The check permits partial objects, explicit property resets and narrower direct PATCH constraints. It does not require whole-schema or annotation/default equality. Deep value compatibility and historical API-version behavior are outside this check's scope; this is partial coverage rather than full Swagger equivalence.

`arm-resource-operation-response` and `use-operation-decorator` provide complementary identity and registration checks, not a substitute for writable-input correspondence.
