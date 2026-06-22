---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Remove `@armCommonDefinition` decorators from `CustomerManagedKeyEncryption` and `Encryption` types so they are emitted inline rather than as common-types `$ref` entries in OpenAPI output.

```tsp
// These types are now emitted inline in specs that reference them:
model MyEncryptionConfig {
  customerManagedKeyEncryption?: Azure.ResourceManager.CommonTypes.CustomerManagedKeyEncryption;
}
```
