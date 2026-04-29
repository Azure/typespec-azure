---
title: arm-version-progression
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-version-progression
```

ARM service versions must be declared in strictly increasing chronological order. For two versions sharing the same date, any preview version (e.g., `-preview`, `-alpha.1`) must come **before** the stable version for that date.

This rule complements [`arm-resource-invalid-version-format`](./arm-resource-invalid-version-format.md), which validates the format of each individual version string. `arm-version-progression` does not flag malformed version strings — those are reported by the format rule.

#### ❌ Incorrect

The stable version is declared before its corresponding preview:

```tsp
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.Contoso;

enum Versions {
  v2024_01_01: "2024-01-01",
  v2024_01_01_preview: "2024-01-01-preview",
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

#### ✅ Correct

```tsp
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.Contoso;

enum Versions {
  v2024_01_01_preview: "2024-01-01-preview",
  v2024_01_01: "2024-01-01",
  v2024_06_01: "2024-06-01",
}
```
