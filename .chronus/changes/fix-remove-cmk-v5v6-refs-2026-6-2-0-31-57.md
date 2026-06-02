---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Remove v5/v6 common-types refs for CustomerManagedKeyEncryption. Add V4-suffixed Foundations equivalents (CustomerManagedKeyEncryptionV4, KeyEncryptionKeyIdentityV4, KeyEncryptionKeyIdentityTypeV4). Add arm-common-definition-excluded linter rule to warn when CustomerManagedKeyEncryption is used directly in service specs.
