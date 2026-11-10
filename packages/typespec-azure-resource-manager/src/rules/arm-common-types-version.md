ARM services must explicitly select a common-types version using `@armCommonTypesVersion` on the service namespace or on every API version enum member. A member's selection overrides the namespace default.

The latest API version must select the newest version available in `Azure.ResourceManager.CommonTypes.Versions`. The latest API version is the last enum member in declaration order, following the ARM version-progression convention. Stable and preview versions share one timeline: neither channel takes precedence.

Historical API versions may retain older common-types selections to preserve their contracts. Missing explicit configuration is still reported for any API version, including historical versions. For an unversioned ARM service, the namespace must explicitly select the latest common-types version.

## Impact

- **Area:** API, SDK

Missing or outdated common-types selections can leave an API and its generated SDKs using older shared schemas and parameters. Update the latest API version without changing historical contracts unnecessarily.

## ❌ Incorrect

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;
```

An outdated selection on the latest API version also warns:

```tsp
@armProviderNamespace
@versioned(Versions)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
namespace Microsoft.Contoso;

enum Versions {
  v2024: "2024-01-01",
  v2025: "2025-01-01",
}
```

## ✅ Correct

Apply `@armCommonTypesVersion` on the namespace:

```tsp
@armProviderNamespace
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
namespace Microsoft.Contoso;
```

## ✅ Correct (per version)

Keep historical selections and update the latest API version:

```tsp
@armProviderNamespace
@versioned(Versions)
namespace Microsoft.Contoso;

enum Versions {
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
  v2024: "2024-01-01",

  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2025: "2025-01-01",
}
```

These examples use `v6`, the latest available common-types version at the time of writing. Check `Azure.ResourceManager.CommonTypes.Versions` for newer versions.

## LintDiff Equivalent

This rule covers the version-selection guidance of [`LatestVersionOfCommonTypesMustBeUsed`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/latest-version-of-common-types-must-be-used.md), limited to the latest API version of a versioned service. It does not inspect individual emitted common-type references or require historical API versions to change their selections.

## Suppression

Prefer updating the latest API version's selection. Suppress only when compatibility requires an older selection and its API and SDK impact has been accepted, or when omitting explicit configuration is intentional because no common-types are used.

Place `#suppress "@azure-tools/typespec-azure-resource-manager/arm-common-types-version" "Compatibility justification"` above the service namespace for missing configuration or an unversioned selection, or above the latest API version enum member for an outdated versioned selection. Historical explicit older selections need no suppression.
