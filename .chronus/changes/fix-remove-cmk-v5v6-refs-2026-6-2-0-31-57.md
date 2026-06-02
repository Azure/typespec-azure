---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add Foundations V4 encryption types (CustomerManagedKeyEncryptionV4, KeyEncryptionKeyIdentityV4, KeyEncryptionKeyIdentityTypeV4) to replace deprecated CustomerManagedKeyEncryption. Add new @armCommonDefinitionExcluded decorator and arm-common-definition-excluded linter rule to warn when CustomerManagedKeyEncryption is used directly in service specifications outside the Azure.ResourceManager namespace. Deprecate CustomerManagedKeyEncryption in favor of the Encryption type.
