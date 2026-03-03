---
title: arm-resource-invalid-version-format
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-version-format
```

ARM resource versions must follow the `YYYY-MM-DD` format, with an optional suffix such as `-preview` or a versioned suffix like `-alpha.1`.

#### ❌ Incorrect

```tsp
enum Versions {
  v1: "v1.0",
  v2: "2024",
}
```

#### ✅ Correct

```tsp
enum Versions {
  v2024_01_01: "2024-01-01",
  v2024_06_01_preview: "2024-06-01-preview",
}
```
