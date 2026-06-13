---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Add base types feature with `@azureBaseType` decorator and Agent base type definitions. Base types provide structured constraints for resources including required and optional properties in their RP-specific property bags. The `@azureBaseType` decorator accepts one or more `BaseTypeInfo` instances to attach base type metadata to resource property models for future validation.
