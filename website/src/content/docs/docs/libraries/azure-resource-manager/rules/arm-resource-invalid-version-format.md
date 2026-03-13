---
title: arm-resource-invalid-version-format
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-version-format
```

ARM resource versions must follow the `YYYY-MM-DD` format, with an optional suffix such as `-preview` or a versioned suffix like `-alpha.1`.

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
