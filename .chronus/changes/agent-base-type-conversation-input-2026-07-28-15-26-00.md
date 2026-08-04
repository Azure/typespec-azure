---
changeKind: fix
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Refine the experimental Agent base type input model: add an `input` property to `ConversationProperties` (mirroring `ResponseProperties.input`, required on create), rename `ConversationItem` to `InputItem`, make its `role` property read-only, and change the `content` field on `InputItem`/`ResponseItem` to `Record<unknown>` to support polymorphic content.
