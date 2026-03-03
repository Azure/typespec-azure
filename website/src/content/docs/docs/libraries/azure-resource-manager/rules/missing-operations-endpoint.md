---
title: "missing-operations-endpoint"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint
```

Check for missing Operations interface. All Azure Resource Manager services must expose the operations endpoint. Add the Operations interface to your service namespace.

#### ❌ Incorrect

```tsp
@armProviderNamespace
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
namespace Microsoft.Contoso;

// missing Operations interface
```

#### ✅ Correct

```tsp
@armProviderNamespace
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
namespace Microsoft.Contoso;

interface Operations extends Azure.ResourceManager.Operations {}
```
