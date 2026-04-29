---
title: arm-version-progression
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-version-progression
```

ARM service api-versions must:

1. Use a **unique date** — every entry's `YYYY-MM-DD` must differ from every other entry's date in the same `Versions` enum. A preview version and a stable version cannot share the same date (for example, `2026-04-28` and `2026-04-28-preview` together is not allowed).
2. Be declared in **strictly increasing chronological order** from top to bottom.

This rule complements [`arm-resource-invalid-version-format`](./arm-resource-invalid-version-format.md), which validates the format of each individual version string. `arm-version-progression` does not flag malformed version strings — those are reported by the format rule.

#### ❌ Incorrect

A preview and a stable version share the same date:

```tsp
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.Contoso;

enum Versions {
  v2026_04_28_preview: "2026-04-28-preview",
  v2026_04_28: "2026-04-28",
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
  v2024_03_01: "2024-03-01",
  v2024_06_01: "2024-06-01",
}
```
