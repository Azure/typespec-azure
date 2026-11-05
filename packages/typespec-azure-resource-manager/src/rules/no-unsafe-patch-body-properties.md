ARM PATCH request bodies should allow partial updates: include only resource properties at their original nesting level, exclude immutable properties, and avoid required fields and defaults.

## How to fix

- Remove properties that do not belong to the resource, or move them to their resource JSON nesting level.
- Exclude immutable `id`, `name`, `type`, `location`, and `properties.provisioningState` from PATCH input.
- Make PATCH fields optional and remove default values, including `false`, `0`, and `""`.
- Exclude properties that cannot be updated. Properties exposed in PATCH input must include `Lifecycle.Update` visibility.

The request is compared with the associated resource, or otherwise its PATCH response or same-route GET response. Keep matching JSON property names and nesting; a PATCH document may omit resource properties.

Required fields inside replacement array elements are allowed. The top-level `identity` property and its descendants are exempt from optionality, default, and visibility checks, but must still match the resource layout. The rule respects effective HTTP optionality; it does not warn about legacy implicit optionality or guarantee SDK optionality.

## Incorrect example

This request exposes immutable `location`, requires `properties` and `displayName`, adds an unknown property, and supplies a default:

```tsp
import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Http;
using Rest;
using Azure.ResourceManager;

@armProviderNamespace
@service
namespace Microsoft.Example;

model Widget
  is TrackedResource<{
    displayName: string;
    description?: string;
  }> {
  @key("widgetName")
  @segment("widgets")
  @path
  name: string;
}

model UnsafeWidgetPatch {
  location?: string;
  properties: {
    displayName: string;
    extra?: string;
    description?: string = "default";
  };
}

@armResourceOperations
interface Widgets {
  update is ArmCustomPatchSync<Widget, UnsafeWidgetPatch>;
}
```

## Correct example

Use an explicit update model with optional, default-free resource properties:

```tsp
import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Http;
using Rest;
using Azure.ResourceManager;

@armProviderNamespace
@service
namespace Microsoft.Example;

model Widget
  is TrackedResource<{
    displayName: string;
    description?: string;
  }> {
  @key("widgetName")
  @segment("widgets")
  @path
  name: string;
}

model WidgetPatch {
  properties?: {
    displayName?: string;
    description?: string;
  };
}

@armResourceOperations
interface Widgets {
  update is ArmCustomPatchSync<Widget, WidgetPatch>;
}
```

## LintDiff Equivalent

- [ConsistentPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/consistent-patch-properties.md)
- [UnSupportedPatchProperties](https://github.com/Azure/azure-openapi-validator/blob/main/docs/un-supported-patch-properties.md)
- [PatchBodyParametersSchema](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-body-parameters-schema.md)

## Impact

- **Area:** API

Unsafe PATCH shapes can prevent partial updates, expose immutable state, or make clients require fields that should be optional.

## Suppression

Suppress only for a documented existing contract that cannot be corrected compatibly. Prefer fixing the property's optionality, default, visibility, or nesting.
