---
title: arm-common-types-version
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-common-types-version
```

ARM services must specify the ARM common-types version using the `@armCommonTypesVersion` decorator. If the same common types version is used across all service versions, this decorator should be applied either on the service namespace or on each version enum member. If the common types version is updated in later versions, the decorator should appear on each version enum member.

#### ❌ Incorrect

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;
```

#### ✅ Correct

Apply `@armCommonTypesVersion` on the namespace:

```tsp
@armProviderNamespace
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
namespace Microsoft.Contoso;
```

#### ✅ Correct (per version)

Apply `@armCommonTypesVersion` on each version enum member:

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

enum Versions {
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
  v1,

  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2,
}
```
