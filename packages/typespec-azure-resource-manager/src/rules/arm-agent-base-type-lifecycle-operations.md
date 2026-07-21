Conversation and Response child resources of an Agent must define create, read, update, and delete lifecycle operations.

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
