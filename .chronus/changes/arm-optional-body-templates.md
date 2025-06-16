---
changeKind: feature
packages:
  - "@azure-tools/azure-http-specs"
---

feat: Add ARM optional body template test cases

Add test scenarios for Azure Resource Manager legacy optional body templates including:
- PATCH operation using Azure.ResourceManager.Legacy.CustomPatchSync with optional empty body
- POST action operation using Azure.ResourceManager.ArmResourceActionSync with optional empty body
- GET operation using Azure.ResourceManager.ArmResourceRead for resource retrieval

These scenarios test the optional request body functionality where operations can be called without sending a request body.