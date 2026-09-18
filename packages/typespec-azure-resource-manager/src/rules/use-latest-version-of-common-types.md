ARM services should use the latest ARM common-types version available in
`Azure.ResourceManager.CommonTypes.Versions`. This keeps TypeSpec services,
generated SDKs, and Azure tooling aligned with the current ARM common schemas.

The rule checks the effective `@armCommonTypesVersion` on each ARM service or
service version. When the selected version is current, it also checks common
types reachable from HTTP operation parameters and payloads so older legacy
symbols are not emitted through an otherwise current API version.
These checks use resolved ARM common-type metadata, including its version and
reference file, rather than parsing generated OpenAPI reference paths.
Selecting the latest version is not sufficient on its own: a legacy symbol can
still resolve to an older supported common-type record. The rule therefore
checks usages as well as the selected version.

If a common type cannot be resolved, the rule reports the resolution failure at
the usage in the user project under this rule's diagnostic code. This diagnostic
can be suppressed in the same way as other diagnostics from this rule.

## Impact

- **Area:** API, SDK

Older ARM common-types versions can expose stale shared schemas or parameters in
generated API surfaces and SDKs even when newer definitions are available.

## Incorrect

```tsp
@armProviderNamespace
@service(#{ title: "Contoso" })
@versioned(Versions)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
namespace Microsoft.Contoso;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v3)
  v2024_01_01: "2024-01-01",
}
```

## Correct

```tsp
@armProviderNamespace
@service(#{ title: "Contoso" })
@versioned(Versions)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
namespace Microsoft.Contoso;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024_01_01: "2024-01-01",
}
```

As of August 2026, `v6` was the latest ARM common-types version.
Newer versions may exist; check `Azure.ResourceManager.CommonTypes.Versions`
for the latest version before updating a service.

## Incorrect

This service selects the latest common-types version but still uses a legacy
common type that resolves to an older common-types file.

```tsp
@armProviderNamespace
@service(#{ title: "Contoso" })
@versioned(Versions)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
namespace Microsoft.Contoso;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024_01_01: "2024-01-01",
}

@route("/identity")
@get
op getIdentity(): Azure.ResourceManager.Legacy.ManagedServiceIdentityV4;
```

## Correct

Use the equivalent common type supported by the selected latest common-types
version, or remove the legacy reference when the API shape no longer needs it.

```tsp
@armProviderNamespace
@service(#{ title: "Contoso" })
@versioned(Versions)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
namespace Microsoft.Contoso;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024_01_01: "2024-01-01",
}

@route("/identity")
@get
op getIdentity(): Azure.ResourceManager.CommonTypes.ManagedServiceIdentity;
```

## LintDiff Equivalent

This rule corresponds to the LintDiff rule
[LatestVersionOfCommonTypesMustBeUsed](https://github.com/Azure/azure-openapi-validator/blob/main/docs/latest-version-of-common-types-must-be-used.md).

## Suppression

Suppress only when an API must intentionally emit an older ARM common-types
schema for compatibility and the service team has accepted the API and SDK
impact.
