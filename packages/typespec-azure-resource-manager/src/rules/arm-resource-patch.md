The request body of a PATCH must be a model with a subset of the resource properties. The PATCH body must not contain properties that do not exist on the resource.

When a PUT shares the PATCH endpoint, the PATCH must have a nonempty object body whose writable JSON properties correspond to PUT input. Matching names must also have compatible types and constraints. For example, a PATCH cannot accept an integer where PUT expects a string, or omit a string-length limit required by PUT.

The comparison includes scalar encodings, enum values, array and dictionary contents, string lengths, item counts and numeric bounds. PATCH may omit required PUT properties, make properties optional and use stricter bounds. Explicitly nullable PATCH properties and dictionary values may clear existing values; null array elements are ordinary values, not resets. Descriptions and default values need not match.

Nested and inherited properties, encoded JSON names and each operation's request visibility are included. A shared resource property hidden from PUT input by `@parameterVisibility(Lifecycle.Create)` cannot satisfy PATCH correspondence. Expose it in PUT input or remove it from PATCH input. A nonempty PATCH body cannot correspond to an absent or void PUT body. Unsupported or ambiguous body types are not treated as empty objects.

The check uses source models, not individual API-version shapes. Version-specific additions, removals, renames and type changes are not evaluated; version-dependent mismatches may therefore be missed or reported incorrectly. Shared version-aware lint evaluation is tracked in [#5875](https://github.com/Azure/typespec-azure/issues/5875).

## Impact

- **Area:** API

Inconsistent PATCH properties violate the RPC contract.

## ❌ Incorrect

`displayName` has incompatible types in the resource and its PATCH model.

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using Azure.ResourceManager;

@service
@armProviderNamespace
namespace Contoso.Widgets;

model WidgetProperties {
  displayName?: string;

  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

model WidgetPatchProperties {
  displayName?: int32;
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

Use the corresponding resource type for `displayName`.

```tsp
import "@typespec/http";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using Azure.ResourceManager;

@service
@armProviderNamespace
namespace Contoso.Widgets;

model WidgetProperties {
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

## Suppression

Suppress per the RPC guidelines; otherwise use the standard PATCH operations.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [ConsistentPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-patch-properties.md).

### Consolidated PATCH coverage

The checks formerly proposed as `patch-properties-correspond-to-put` are part of `arm-resource-patch`, not a separate rule to enable.

| Migrated lintdiff rule                                                                                                                                       | Coverage in this existing TypeSpec rule                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ConsistentPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-patch-properties.md)                                  | The existing resource checks require PATCH input to be a model whose properties are a subset of the resource, including the required tags behavior.                                                                                                                                                      |
| [PatchPropertiesCorrespondToPutProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-properties-correspond-to-put-properties.md) | For authored PATCH and PUT operations at the same HTTP path, checks nonempty PATCH input, writable JSON leaf correspondence and compatible types and supported constraints. Includes nested/inherited properties, encoded names and request visibility; individual API-version shapes are not evaluated. |

The paired-endpoint check also applies to custom HTTP operations. Without a matching PUT, only the applicable existing resource checks run. Unsupported body shapes are skipped rather than interpreted as empty objects.

The compatibility policy permits partial objects, explicit property resets and narrower PATCH constraints. It does not require whole-schema equality, annotation/default equality or identical enum declaration names. Historical API-version behavior is outside this check's source-model scope.

`arm-resource-operation-response` and `use-operation-decorator` provide complementary identity and registration checks, not a substitute for writable-input correspondence.
