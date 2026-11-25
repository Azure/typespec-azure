ARM resource paths must spell the scope segments `subscriptions` and
`resourceGroups` exactly. Each incorrectly cased occurrence produces a warning
on its operation. The rule checks complete segments, not path parameter names
or collection names such as `SubscriptionsHistory`.

Standard ARM operation templates use canonical scope segments by default.
When customizing `BaseParameters`, keep those canonical `@segment` values.
The following examples assume an ARM service with a `Widget` proxy resource and
the standard `Operations` interface.

## Impact

- **Area:** API, SDK

Incorrect scope casing can prevent resource-provider registration and produce
inconsistent resource URLs in generated clients.

## ❌ Incorrect

```typespec
model CustomBase {
  ...CommonTypes.ApiVersionParameter;
  ...CommonTypes.SubscriptionIdParameter;
  @path @segment("resourcegroups") resourceGroupName: string;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget, BaseParameters = CustomBase>;
}
```

## ✅ Correct

```typespec
model CustomBase {
  ...CommonTypes.ApiVersionParameter;
  ...CommonTypes.SubscriptionIdParameter;
  @path @segment("resourceGroups") resourceGroupName: string;
}

@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget, BaseParameters = CustomBase>;
}
```

## Suppression

Fix incorrect scope segments instead of suppressing the warning. Suppress only
for a confirmed false positive or an existing endpoint whose casing cannot
change without breaking compatibility, with approval from the ARM reviewer.

## LintDiff Equivalent

This rule covers the canonical scope-segment guideline from
[SubscriptionsAndResourceGroupCasing](https://github.com/Azure/azure-openapi-validator/blob/main/docs/subscriptions-and-resource-group-casing.md).
