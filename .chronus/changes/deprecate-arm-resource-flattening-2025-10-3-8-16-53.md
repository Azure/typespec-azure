---
changeKind: deprecation
packages:
  - "@azure-tools/typespec-autorest"
  - "@azure-tools/typespec-azure-resource-manager"
---

Deprecate `arm-resource-flattening` option to reduce confusion with new flattening mechanisms.

  ```diff lang=yaml title=tspconfig.yaml
  options:
    @azure-tools/typespec-autoprest:
  -   arm-resource-flattening: true
  ```

  ```diff lang=tsp title=MyResource.tsp
  +@@Azure.ClientGenerator.Core.Legacy.flattenProperty(MyResource.properties, "autorest");
  ```
