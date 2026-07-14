---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Refine the experimental Agent base type conversation and response items: remove the redundant `conversationId` and `responseId` properties (inferred from the resource `name`), model the message author `role` as a `MessageRole` enum (`Developer`, `User`, `Assistant`, `Tool`), and extend `ConversationItem` and `ResponseItem` with a `type` discriminator (`message`, `function_call`, `function_call_output`, `compaction`) whose variant-specific fields are all optional.
