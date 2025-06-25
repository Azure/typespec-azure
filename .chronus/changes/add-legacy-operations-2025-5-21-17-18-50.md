---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add a legacy operation template for `Operations_List` that enables customization of both the response and error response types. This provides flexibility to specify custom response or error as needed.

For example:
```tsp
interface Operations
  extends Azure.ResourceManager.Legacy.Operations<Response = ArmResponse<Azure.Core.Page<CustomResponse>> {}
```
