Use this rule to catch ordering mistakes across otherwise well-formed service versions. It complements [`arm-resource-invalid-version-format`](./arm-resource-invalid-version-format.md), which validates the format of each individual version string; `arm-version-progression` does not flag malformed version strings because those are reported by the format rule.

## Impact

- **Area:** API, SDK, Tooling

Out-of-order versions, or versions with matching dates, make specs unmaintainable and cause SDK problems.

## ❌ Incorrect

A preview and a stable version share the same date:

```tsp
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.Contoso;

enum Versions {
  v2026_04_28: "2026-04-28",
  v2026_04_28_preview: "2026-04-28-preview",
}
```

Versions are declared out of chronological order:

```tsp
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.Contoso;

enum Versions {
  v2024_06_01: "2024-06-01",
  v2024_01_01: "2024-01-01",
}
```

## ✅ Correct

```tsp
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.Contoso;

enum Versions {
  v2024_01_01: "2024-01-01",
  v2024_03_01: "2024-03-01",
  v2024_06_01_preview: "2024-06-01-preview",
}
```

A stable version followed by a preview that is chronologically later (one day after) is also valid — previews must come chronologically after the most recent stable version:

```tsp
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.Contoso;

enum Versions {
  v2024_03_01: "2024-03-01",
  v2024_06_01: "2024-06-01",
  v2024_06_02_preview: "2024-06-02-preview",
}
```

## Suppression

Do not suppress. Ensure new api-versions are unique and monotonically increasing from top to bottom in the Versions enum.
