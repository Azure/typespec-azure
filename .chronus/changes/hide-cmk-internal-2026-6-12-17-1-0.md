---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Hide `CustomerManagedKeyEncryption`, `KeyEncryptionKeyIdentity`, and `KeyEncryptionKeyIdentityType` common types by marking them `internal`. Add public replacement types `CustomerManagedKeyEncryptionV4`, `KeyEncryptionKeyIdentityV4`, and `KeyEncryptionKeyIdentityTypeV4` in the `Azure.ResourceManager.Foundations` namespace.

```tsp
// Use the new Foundations types instead of the internal CommonTypes types:
model EncryptionConfig {
  customerManagedKey?: Azure.ResourceManager.Foundations.CustomerManagedKeyEncryptionV4;
}
```
