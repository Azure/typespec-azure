---
title: Change the provider namespace
---

If you want to have a different provider namespace than the TypeSpec namespec you'll have to change the following

## 1. Change the name in the spec

```tsp
@armProviderNamespace("MyDifferent.ProviderName")
namespace Microsoft.Contoso {

}
```

## 2. Change the output configuration

If you want to match the folder structure of the azure-specs repo you might have to replace the `{service-name}` interpolation with the name you changed.

```diff
options:
  '@azure-tools/typespec-autorest':
     # ... other options
-    output-file: "{azure-resource-provider-folder}/{service-name}/{version-status}/{version}/xxx.json"
+    output-file: "{azure-resource-provider-folder}/MyDifferent.ProviderName/{version-status}/{version}/xxx.json"
```
