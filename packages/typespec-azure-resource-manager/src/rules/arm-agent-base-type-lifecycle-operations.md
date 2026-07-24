Conversation and Response child resources of an Agent must define create, read, update, and delete lifecycle operations.

## Impact

- **Area:** API, SDK

Agent base types must correctly model their lifecycle operations; violations can misrepresent the resource for emitters and tooling.

#### ❌ Incorrect

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model MyAgent is Agent<MyAgentProperties> {
  ...ResourceNameParameter<MyAgent>;
}

model MyConversation is AgentConversation<MyConversationProperties, MyAgent> {
  ...ResourceNameParameter<MyConversation>;
}

@armResourceOperations
interface Conversations {
  get is ArmResourceRead<MyConversation>;
  // Missing createOrUpdate, update, and delete
}
```

#### ✅ Correct

```tsp
@armProviderNamespace
namespace Microsoft.Contoso;

model MyAgent is Agent<MyAgentProperties> {
  ...ResourceNameParameter<MyAgent>;
}

model MyConversation is AgentConversation<MyConversationProperties, MyAgent> {
  ...ResourceNameParameter<MyConversation>;
}

@armResourceOperations
interface Conversations {
  get is ArmResourceRead<MyConversation>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<MyConversation>;
  update is ArmCustomPatchSync<
    MyConversation,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<MyConversation, MyConversationProperties>
  >;
  delete is ArmResourceDeleteWithoutOkAsync<MyConversation>;
  listByAgent is ArmResourceListByParent<MyConversation>;
}
```

## Suppression

Suppress only when required to match an existing API; otherwise use the standard agent base type patterns.
