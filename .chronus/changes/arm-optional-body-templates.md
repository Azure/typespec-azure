---
changeKind: feature
packages:
  - "@azure-tools/azure-http-specs"
---

feat: Add comprehensive ARM optional body template test cases

Add test scenarios for Azure Resource Manager optional body templates including:
- GET operation using Azure.ResourceManager.ArmResourceRead for resource retrieval
- PATCH operation using Azure.ResourceManager.Legacy.CustomPatchSync with OptionalRequestBody = true
- POST action operation using Azure.ResourceManager.ArmResourceActionSync with OptionalRequestBody = true  
- POST provider action operation using Azure.ResourceManager.ArmProviderActionSync with OptionalRequestBody = true

Each PATCH and POST operation tests both empty body and with-body scenarios using withServiceKeys to validate the optional request body functionality where operations can be called with or without sending a request body.