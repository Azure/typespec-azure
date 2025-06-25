---
title: arm-custom-resource-no-key
---

```text title=- Full name-
@azure-tools/typespec-azure-resource-manager/arm-custom-resource-no-key
```

Custom Azure resource models must define a key property using the `@key` decorator, especially if the custom resource will be used in operations. Without a key, operation paths may be duplicated.

#### ❌ Incorrect

```tsp
@Azure.ResourceManager.Legacy.customAzureResource
model CustomResource {
  someId: string;
}
```

#### ✅ Correct

```tsp
@Azure.ResourceManager.Legacy.customAzureResource
model CustomResource {
  @key
  someId: string;
}
```
