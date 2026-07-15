---
title: arm-agent-base-type-child-resources
---

```text title="Full name"
@azure-tools/typespec-azure-resource-manager/arm-agent-base-type-child-resources
```

Resources decorated with `@azureBaseType` for the Agent base type must have both a Conversation and a Response child resource.

#### ❌ Incorrect

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model MyAgentProperties is Azure.ResourceManager.BaseTypes.Agents.AgentPropertiesPlatform {
  ...DefaultProvisioningStateProperty;
}

@azureBaseType(#{ baseType: BaseType.Agent, version: "2024-06-01" })
model MyAgent is TrackedResource<MyAgentProperties> {
  ...ResourceNameParameter<MyAgent>;
}
```

#### ✅ Correct

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model MyAgentProperties is Azure.ResourceManager.BaseTypes.Agents.AgentPropertiesPlatform {
  ...DefaultProvisioningStateProperty;
}

model MyAgent is Agent<MyAgentProperties> {
  ...ResourceNameParameter<MyAgent>;
}

model MyConversationProperties is Azure.ResourceManager.BaseTypes.Agents.ConversationProperties;

model MyConversation is AgentConversation<MyConversationProperties, MyAgent> {
  ...ResourceNameParameter<MyConversation>;
}

model MyResponseProperties is Azure.ResourceManager.BaseTypes.Agents.ResponseProperties;

model MyResponse is AgentResponse<MyResponseProperties, MyAgent> {
  ...ResourceNameParameter<MyResponse>;
}
```
