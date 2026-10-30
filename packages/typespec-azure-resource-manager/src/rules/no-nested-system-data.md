System data describes who created or last modified an ARM resource and when. It belongs in the resource envelope, alongside `id`, `name`, and `type`, rather than in resource-specific settings.

This rule checks models with a JSON property named `properties`. It finds `systemData` and `SystemData` anywhere inside that bag, including nested models, inherited properties and dictionary values, arrays, union variants, and applicable alternatives of a model marked with `@discriminator`. Unrelated inheritance descendants and sibling alternatives of an already narrowed subtype are not included. JSON encoded names are respected. Each offending declaration is reported once, even when several resources share it.

Use the standard ARM resource templates, which already provide the envelope's `systemData` property. Do not redeclare it inside the resource's properties model.

## ❌ Incorrect

```tsp
import "@azure-tools/typespec-azure-resource-manager";

using Azure.ResourceManager;

@service
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

model WidgetProperties {
  description?: string;
  systemData?: {
    createdBy?: string;
  };
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
}
```

## ✅ Correct

```tsp
import "@azure-tools/typespec-azure-resource-manager";

using Azure.ResourceManager;

@service
@armProviderNamespace
namespace Microsoft.Contoso;

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

model WidgetProperties {
  description?: string;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
}
```

## Impact

**API, SDK.** Nested system data creates a nonstandard resource shape and corresponding SDK properties. Moving an existing property changes the API contract; review compatibility before correcting an already released API.

## Suppression

Suppress only when an ARM reviewer has approved retaining an existing contract. Place the directive on the offending property declaration, including when that declaration is shared by several bags.

```tsp
model WidgetProperties {
  #suppress "@azure-tools/typespec-azure-resource-manager/no-nested-system-data" "Retain the existing API contract approved by the ARM reviewer."
  systemData?: {
    createdBy?: string;
  };
}
```

## LintDiff Equivalent

[SystemDataInPropertiesBag](https://github.com/Azure/azure-openapi-validator/blob/main/docs/system-data-in-properties-bag.md) checks resolved ARM Swagger definitions for nested system data. This native rule traverses the full property-type graph and reports each distinct authored property instead of only the first matching path per emitted definition. Schema metadata keys are not property declarations and are not checked.
