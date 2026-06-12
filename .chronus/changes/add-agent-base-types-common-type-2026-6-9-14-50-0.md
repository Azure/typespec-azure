---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add an experimental `Azure.ResourceManager.BaseTypes` namespace describing the ARM `agent` base type schema, exposed as a separate package export (`@azure-tools/typespec-azure-resource-manager/base-types`) and versioned (`1.0-preview.1`). This includes the `AgentBaseTypePropertiesAppliance`/`AgentBaseTypePropertiesPlatform`, `AgentDefinition`/`AgentDefinitionAppliance`/`AgentDefinitionPlatform`, `AgentTool`/`AgentToolAppliance`/`AgentToolPlatform`, `BaseType`, `Conversation`, `ConversationItem`, `Response`, `InputMessage`, `ResponseOutputItem`, `ResponseUsage`, `ResponseError`, and `ResponseIncompleteDetails` models, capturing per-field mutability through the Appliance (read-only) and Platform (writable) model variants.

```tsp
import "@azure-tools/typespec-azure-resource-manager/base-types";

using Azure.ResourceManager.BaseTypes;
```
