---
changeKind: feature
packages:
  - "@azure-tools/typespec-autorest"
  - "@azure-tools/typespec-azure-resource-manager"
---

Removed direct reference to OpenAPI extension `x-ms-azure-resource` in ARM library and replaced with `@Azure.ResourceManager.Private.azureResourceBase` decorator. It is only used internally on base resource types. `autorest` emitter has been updated to check the decorator and still emit `x-ms-azure-resource` extension in swagger. 
