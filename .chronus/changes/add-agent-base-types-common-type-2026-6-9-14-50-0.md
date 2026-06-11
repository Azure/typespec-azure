---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add agent base type common-type definitions (in common-types `v6`) describing the ARM `agent` base type schema. This includes the `AgentBaseTypePropertiesAppliance`/`AgentBaseTypePropertiesPlatform`, `AgentDefinition`/`AgentDefinitionAppliance`/`AgentDefinitionPlatform`, `AgentTool`/`AgentToolAppliance`/`AgentToolPlatform`, `BaseType`, `Conversation`, `ConversationItem`, `Response`, `InputMessage`, `ResponseOutputItem`, `ResponseUsage`, `ResponseError`, and `ResponseIncompleteDetails` models, capturing per-field mutability through the Appliance (read-only) and Platform (writable) model variants.
