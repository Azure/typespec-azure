---
changeKind: breaking
packages:
  - "@azure-tools/typespec-autorest"
---

- Remove deprecated `arm-resource-flattening` option

  ```diff lang=yaml title=tspconfig.yaml
  options:
    @azure-tools/typespec-autorest:
  -   arm-resource-flattening: true
  ```

  ```diff lang=tsp title=MyResource.tsp
  +@@Azure.ClientGenerator.Core.Legacy.flattenProperty(MyResource.properties, "autorest");
  ```
