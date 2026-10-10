ARM HTTP PATCH operation names should start with `update`, ignoring case. Use names such as
`update`, `updateTags`, or `updateWidget` instead of `patch`, `modify`, or `create`.
This check applies to concrete HTTP service endpoints regardless of their response status codes.

Consistent partial-update names make ARM APIs easier to discover and give generated SDKs a
predictable operation naming convention. The check uses the authored operation name, not an SDK
name override or the containing interface name.

## Incorrect

```tsp
@armProviderNamespace
@service
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.Contoso;

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  name: string;
}

model WidgetProperties {
  provisioningState?: ResourceProvisioningState;
}

@armResourceOperations
interface Widgets {
  modify is ArmResourcePatchSync<Widget, Properties = WidgetProperties>;
}
```

## Correct

```tsp
@armProviderNamespace
@service
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.Contoso;

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  name: string;
}

model WidgetProperties {
  provisioningState?: ResourceProvisioningState;
}

@armResourceOperations
interface Widgets {
  update is ArmResourcePatchSync<Widget, Properties = WidgetProperties>;
}
```

The examples assume the usual ARM library imports and `using` declarations.

## Impact

**API, SDK.** Inconsistent partial-update operation names make APIs harder to discover. Renaming
an already shipped operation may break existing SDK callers.

## Suppression

Suppress this warning when compatibility requires preserving a shipped operation name. Prefer
an `update` prefix for new operations.

```tsp
@armResourceOperations
interface Widgets {
  #suppress "@azure-tools/typespec-azure-resource-manager/use-update-for-patch" "Preserve the shipped SDK operation name."
  modify is ArmResourcePatchSync<Widget, Properties = WidgetProperties>;
}
```

## LintDiff Equivalent

This rule corresponds to
[`PatchInOperationName`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/patch-in-operation-name.md).
It enforces authored ARM endpoint names rather than reproducing emitted-operation-ID exemptions.
