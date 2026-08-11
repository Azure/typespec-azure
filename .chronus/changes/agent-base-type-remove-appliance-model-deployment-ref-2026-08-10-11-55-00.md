---
changeKind: breaking
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Remove `modelDeploymentRef` from the experimental Agent base type `AgentDefinitionAppliance` model. The appliance owns the entire agent definition, so the property is now Platform-only and remains available on `AgentDefinitionPlatform`. As a result `AgentDefinitionAppliance` takes a single template parameter (`AgentDefinitionAppliance<HasInstructions>` instead of `AgentDefinitionAppliance<HasModelDeploymentRef, HasInstructions>`), and `AgentPropertiesAppliance.definition` is read-only again since it no longer needs to carry a client-writable field.
