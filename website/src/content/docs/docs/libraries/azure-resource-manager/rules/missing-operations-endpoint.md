---
title: "missing-operations-endpoint"
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint
```

Check for missing Operations interface. All Azure Resource Manager services must expose the operations endpoint. Add the Operations interface to your service namespace.

#### ❌ Incorrect

```tsp title="main.tsp"
@armProviderNamespace
namespace MyService;
```

#### ✅ Correct

```tsp title="main.tsp"
@armProviderNamespace
namespace MyService;

interface Operations extends Azure.ResourceManager.Operations {}
```
