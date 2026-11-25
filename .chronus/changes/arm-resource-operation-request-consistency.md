---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Extend `arm-resource-operation-response` to require PUT request bodies to match their associated resource and both 200 and 201 response bodies to be resource models. This covers the authoring guidance of `PutRequestResponseSchemeArm`, `PutGetPatchResponseSchema`, and `XmsResourceInPutResponse`.

Check resource operation contracts at each resolved scope, including resource models reused at multiple scopes.
