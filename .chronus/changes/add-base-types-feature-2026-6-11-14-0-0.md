---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-azure-rulesets"
---

Adding Azure Resource Manager Base Types, including the Agent base type.

Base types provide structured constraints for resources including required and optional
properties in their RP-specific property bags. The `@azureBaseType` decorator attaches
base type metadata to resource models for validation.

Example of creating an Agent resource:

```typespec
using Azure.ResourceManager;
using Azure.ResourceManager.BaseTypes;
using Azure.ResourceManager.BaseTypes.Agents;

model MyAgentProperties is AgentPropertiesPlatform {
  ...DefaultProvisioningStateProperty;
}

model MyAgent is Agent<MyAgentProperties> {
  ...ResourceNameParameter<MyAgent>;
}

model MyConversationProperties is ConversationProperties {
  ...DefaultProvisioningStateProperty;
}

model MyConversation is AgentConversation<MyConversationProperties, MyAgent> {
  ...ResourceNameParameter<MyConversation>;
}

model MyResponseProperties is ResponseProperties {
  ...DefaultProvisioningStateProperty;
}

model MyResponse is AgentResponse<MyResponseProperties, MyAgent> {
  ...ResourceNameParameter<MyResponse>;
}
```
