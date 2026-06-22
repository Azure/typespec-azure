---
title: arm-agent-base-type-child-resources
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-agent-base-type-child-resources
```

Resources decorated with `@azureBaseType` for the Agent base type must have both a Conversation and a Response child resource.

#### ❌ Incorrect

```tsp
using Azure.ResourceManager.BaseTypes;
using Azure.ResourceManager.BaseTypes.Agents;

@armProviderNamespace
namespace Microsoft.Contoso;

model MyDefinition is AgentDefinitionPlatform<true, true>;

model MyAgentProperties is AgentPropertiesPlatform<MyDefinition> {
  ...DefaultProvisioningStateProperty;
}

// Agent resource with no Conversation or Response child resources
#suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "Experimental BaseTypes"
model MyAgent is Agent<MyAgentProperties> {
  ...ResourceNameParameter<MyAgent>;
}
```

#### ✅ Correct

```tsp
using Azure.ResourceManager.BaseTypes;
using Azure.ResourceManager.BaseTypes.Agents;

@armProviderNamespace
namespace Microsoft.Contoso;

model MyDefinition is AgentDefinitionPlatform<true, true>;

model MyAgentProperties is AgentPropertiesPlatform<MyDefinition> {
  ...DefaultProvisioningStateProperty;
}

#suppress "@azure-tools/typespec-azure-resource-manager/basetypes-experimental" "Experimental BaseTypes"
model MyAgent is Agent<MyAgentProperties> {
  ...ResourceNameParameter<MyAgent>;
}

model MyConversationProperties is ConversationProperties;

model MyConversation is AgentConversation<MyConversationProperties, MyAgent> {
  ...ResourceNameParameter<MyConversation>;
}

model MyResponseProperties is ResponseProperties;

model MyResponse is AgentResponse<MyResponseProperties, MyAgent> {
  ...ResourceNameParameter<MyResponse>;
}
```
