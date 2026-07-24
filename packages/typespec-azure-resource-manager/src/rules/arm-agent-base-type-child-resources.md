Resources decorated with `@azureBaseType` for the Agent base type must have both a Conversation and a Response child resource.

## Impact

- **Area:** API, SDK

Agent base types must correctly model their child resources; violations can misrepresent the resource for emitters and tooling.

## ❌ Incorrect

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

## ✅ Correct

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

## Suppression

Suppress only when required to match an existing API; otherwise use the standard agent base type patterns.
