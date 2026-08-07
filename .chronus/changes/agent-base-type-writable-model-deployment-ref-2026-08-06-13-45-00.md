---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Make `modelDeploymentRef` writable in the experimental Agent base type `AgentDefinitionAppliance` model instead of read-only, so the client can select the underlying model deployment in both the Appliance and Platform deployment models.
