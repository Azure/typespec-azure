---
changeKind: breaking
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Consolidate SdkOperationGroup into SdkClient. The @operationGroup decorator and SdkOperationGroup type are deprecated. SdkClient now has subClients, clientPath, and parent properties. Migration: replace SdkOperationGroup with SdkClient, use subClients instead of subOperationGroups, use clientPath instead of groupPath. SdkClientType.__raw is now SdkClient (was SdkClient | SdkOperationGroup), use subClients instead of children.