ARM resource versions must follow the `YYYY-MM-DD` format, with an optional suffix such as `-preview` or a versioned suffix like `-alpha.1`.

## Impact

- **Area:** API

The api-version does not follow the required format, violating the RPC contract.

## LintDiff Equivalent

This rule corresponds to the LintDiff rule [ApiVersionPattern](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md#r3012).

#### ❌ Incorrect

```tsp
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.Contoso;

enum Versions {
  v1: "1.2.3",
}
```

#### ✅ Correct

```tsp
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.Contoso;

enum Versions {
  v2024_01_01: "2024-01-01",
  v2024_06_01_preview: "2024-06-01-preview",
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use the `YYYY-MM-DD[-preview]` format.
