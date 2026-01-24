---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: deprecation
packages:
  - "@azure-tools/typespec-autorest"
---

Deprecate `azure-resource-provider-folder` option.

```diff lang=yaml
-azure-resource-provider-folder: "resource-manager"
-output-file: "{azure-resource-provider-folder}/{service-name}/{version-status}/{version}/openapi.json"
+output-file: "resource-manager/{service-name}/{version-status}/{version}/openapi.json"
```
