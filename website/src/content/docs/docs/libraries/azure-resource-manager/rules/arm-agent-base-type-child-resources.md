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

model MyAgentProperties {
  displayName: string;
  description: string;
}

@azureBaseType(#[#{ baseType: "Agent", version: "2024-06-01" }])
model MyAgent is TrackedResource<MyAgentProperties> {
  @key("myAgentName") @segment("myAgents") name: string;
}
```

#### ✅ Correct

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model MyAgentProperties {
  displayName: string;
  description: string;
}

@azureBaseType(#[#{ baseType: "Agent", version: "2024-06-01" }])
model MyAgent is TrackedResource<MyAgentProperties> {
  @key("myAgentName") @segment("myAgents") name: string;
}

model MyConversationProperties is Azure.ResourceManager.BaseTypes.Agents.ConversationProperties;

@parentResource(MyAgent)
model MyConversation is ProxyResource<MyConversationProperties> {
  @key("conversationName") @segment("conversations") name: string;
}

model MyResponseProperties is Azure.ResourceManager.BaseTypes.Agents.ResponseProperties;

@parentResource(MyAgent)
model MyResponse is ProxyResource<MyResponseProperties> {
  @key("responseName") @segment("responses") name: string;
}
```
