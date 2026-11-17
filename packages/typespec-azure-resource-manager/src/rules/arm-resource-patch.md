The request body of a PATCH must be a model with a subset of the resource properties. The PATCH body must not contain properties that do not exist on the resource.

When a PUT shares the PATCH endpoint, the PATCH must have a nonempty object body whose writable JSON property names correspond to PUT input. PATCH may omit PUT properties and make properties optional.

The paired-endpoint check compares property names, not value compatibility. Types, formats, string lengths, item counts, numeric bounds, enum values, encodings and array/dictionary contents are not compared. Descriptions and default values need not match. A clean lint result does not prove that every PATCH value is accepted by PUT.

Nested and inherited properties, encoded JSON names and each operation's request visibility are included. Operations inherited into project interfaces are also checked, with library-defined findings targeted at the project interface. A shared resource property hidden from PUT input by `@parameterVisibility(Lifecycle.Create)` cannot satisfy PATCH correspondence. Expose it in PUT input or remove it from PATCH input. A nonempty PATCH body cannot correspond to an absent or void PUT body. Unsupported or ambiguous body types are not treated as empty objects.

An object whose children are not writable in PATCH is matched with the PUT property at the same JSON payload position. Its container must still be valid PUT input; an unrelated same-named property does not satisfy this check.

The check uses source models, not individual API-version shapes. Version-specific additions, removals, renames and type changes are not evaluated; version-dependent mismatches may therefore be missed or reported incorrectly. Shared version-aware lint evaluation is tracked in [#5875](https://github.com/Azure/typespec-azure/issues/5875).

## Impact

- **Area:** API

Inconsistent PATCH properties violate the RPC contract.

## ❌ Incorrect

`extra` is writable in PATCH but does not exist in PUT input.

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
  extra?: string;
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

Remove the extra property so that every PATCH input property exists in PUT input.

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

| Migrated lintdiff rule                                                                                                                                       | Coverage in this existing TypeSpec rule                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ConsistentPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-patch-properties.md)                                  | The existing resource checks require PATCH input to be a model whose properties are a subset of the resource, including the required tags behavior.                                                                                                                                                                              |
| [PatchPropertiesCorrespondToPutProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-properties-correspond-to-put-properties.md) | For project PATCH and PUT operations at the same HTTP path, including inherited operations, checks nonempty PATCH input and writable JSON property-name correspondence. Includes nested/inherited properties, encoded names and request visibility; value types, constraints and individual API-version shapes are not compared. |

The paired-endpoint check also applies to custom HTTP operations. Without a matching PUT, only the applicable existing resource checks run. Unsupported body shapes are skipped rather than interpreted as empty objects.

The check permits partial objects and explicit property resets. It does not require whole-schema or annotation/default equality. Value/constraint compatibility and historical API-version behavior are outside this check's scope; this is partial coverage rather than full Swagger equivalence.

`arm-resource-operation-response` and `use-operation-decorator` provide complementary identity and registration checks, not a substitute for writable-input correspondence.
