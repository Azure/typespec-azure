---
title: arm-common-definition-excluded
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-common-definition-excluded
```

Verify that types marked as excluded from direct use in service specifications are not referenced directly in user service specs. Use the equivalent type from `Azure.ResourceManager.Foundations` instead.

#### ❌ Incorrect

```tsp
@armProviderNamespace
@service
namespace Microsoft.Contoso;

model EncryptionConfig {
  customerManagedKey: Azure.ResourceManager.CommonTypes.CustomerManagedKeyEncryption;
}
```

#### ✅ Correct

Use the equivalent type from `Azure.ResourceManager.Foundations`:

```tsp
@armProviderNamespace
@service
namespace Microsoft.Contoso;

model EncryptionConfig {
  customerManagedKey: Azure.ResourceManager.Foundations.CustomerManagedKeyEncryptionV4;
}
```

Or use the `Encryption` wrapper type which is the recommended approach:

```tsp
@armProviderNamespace
@service
namespace Microsoft.Contoso;

model ResourceProperties {
  encryption?: Azure.ResourceManager.CommonTypes.Encryption;
}
```
