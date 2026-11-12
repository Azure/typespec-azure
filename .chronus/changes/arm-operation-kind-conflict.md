---
changeKind: breaking
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Report `arm-resource-operation-kind-conflict` when an operation is registered with different ARM operation kinds, including registrations inherited from operation templates. Previously accepted combinations such as `@armResourceAction` with `@armResourceList` now fail compilation. Keep one ARM operation kind per operation; HTTP methods and paging annotations do not require a second ARM registration. Overrides that change only logical grouping remain supported.
