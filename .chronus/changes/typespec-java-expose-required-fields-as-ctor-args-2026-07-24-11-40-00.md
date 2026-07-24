---
changeKind: fix
packages:
  - "@azure-tools/typespec-java"
---

Expose the `required-fields-as-ctor-args` emitter option in `tspconfig.yaml`. It controls whether required model properties are generated as constructor arguments. The default remains `true`.

```yaml
options:
  "@azure-tools/typespec-java":
    required-fields-as-ctor-args: false
```
