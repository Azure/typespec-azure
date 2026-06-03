---
title: no-deprecated-common-types
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/no-deprecated-common-types
```

Verify that deprecated common types are not referenced directly in user service specs. Use the replacement type suggested in the diagnostic message.

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

Use the `Encryption` wrapper type which is the recommended approach:

```tsp
@armProviderNamespace
@service
namespace Microsoft.Contoso;

model ResourceProperties {
  encryption?: Azure.ResourceManager.CommonTypes.Encryption;
}
```

Or use the equivalent type from `Azure.ResourceManager.Foundations`:

```tsp
@armProviderNamespace
@service
namespace Microsoft.Contoso;

model EncryptionConfig {
  customerManagedKey: Azure.ResourceManager.Foundations.CustomerManagedKeyEncryptionV4;
}
```
