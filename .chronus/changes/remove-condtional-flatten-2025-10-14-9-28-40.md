---
changeKind: breaking
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

- Remove Private decorator `@Azure.ResourceManager.Private.conditionalClientFlatten`

  ```diff lang=tsp
  @Azure.ResourceManager.Private.conditionalClientFlatten
  ```

  ```diff lang=tsp title=MyResource.tsp
  +@Azure.ClientGenerator.Core.Legacy.flattenProperty
  ```
