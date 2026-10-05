ARM services should explicitly select the latest version in
`Azure.ResourceManager.CommonTypes.Versions` using `@armCommonTypesVersion`.
Apply the decorator to the service namespace when all API versions use the same
common-types version. A decorator on an API version enum member overrides the
namespace selection for that API version.

The rule warns when explicit version configuration is missing or when an
effective selection is older than the latest available version. It checks
version selections, not individual legacy type usages.

## Impact

- **Area:** API, SDK

Missing or outdated common-types selections can leave an API and its generated
SDKs using older shared schemas and parameters. Latest-version warnings are
enabled wherever this rule is enabled, including the resource-manager ruleset.

## ❌ Incorrect

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;
```

An explicit older selection also produces a warning:

```tsp
@armProviderNamespace
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
namespace Microsoft.Contoso;
```

## ✅ Correct

Select the latest version on the namespace and use standard ARM resource
operation templates:

```tsp
import "@azure-tools/typespec-azure-resource-manager";
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";

using Azure.ResourceManager;
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;

@armProviderNamespace
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
@versioned(Versions)
namespace Microsoft.Contoso;

enum Versions {
  v2026_08_01: "2026-08-01",
}

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

model WidgetProperties {
  /** The resource provisioning state. */
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
}
```

Alternatively, apply `@armCommonTypesVersion` to every API version enum member
instead of the namespace. Every effective selection must use the latest version
to satisfy this rule.

As of August 2026, `v6` was the latest ARM common-types version.
Newer versions may exist; check `Azure.ResourceManager.CommonTypes.Versions`
before updating a service.

## LintDiff Equivalent

This rule covers the version-selection guidance of
[`LatestVersionOfCommonTypesMustBeUsed`](https://github.com/Azure/azure-openapi-validator/blob/main/docs/latest-version-of-common-types-must-be-used.md).
Unlike the OpenAPI rule, it does not inspect emitted common-type references.

## Suppression

Prefer updating `@armCommonTypesVersion` to the latest version. Suppress only
when an older version is required for compatibility and the API and SDK impact
has been accepted, or when no common-types are used and omitting the selection
is intentional.

Place `#suppress "@azure-tools/typespec-azure-resource-manager/arm-common-types-version" "Compatibility justification"`
above the service namespace for missing configuration or an unversioned
selection, or above the affected API version enum member for a versioned
selection. Suppressing the rule also suppresses its missing-configuration check
within that scope.
