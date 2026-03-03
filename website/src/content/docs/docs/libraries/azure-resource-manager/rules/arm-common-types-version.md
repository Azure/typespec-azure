---
title: arm-common-types-version
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-common-types-version
```

ARM services must specify the ARM common-types version using the `@armCommonTypesVersion` decorator. This decorator should be applied either on the service namespace or on each version enum member.

#### ❌ Incorrect

```tsp
@armProviderNamespace
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@server("https://management.azure.com", "ARM endpoint")
namespace Microsoft.Contoso;
```

#### ✅ Correct

```tsp
@armProviderNamespace
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@server("https://management.azure.com", "ARM endpoint")
namespace Microsoft.Contoso;
```

#### ✅ Correct (versioned)

```tsp
@armProviderNamespace
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@server("https://management.azure.com", "ARM endpoint")
namespace Microsoft.Contoso;

enum Versions {
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v1: "2024-01-01",
}
```
