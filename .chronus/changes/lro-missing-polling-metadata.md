---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
---

Add the `lro-missing-polling-metadata` lint rule to require native polling metadata for ARM operations with `Location` or `Azure-AsyncOperation` response headers.

Enable this opt-in rule explicitly:

```yaml
linter:
  enable:
    "@azure-tools/typespec-azure-resource-manager/lro-missing-polling-metadata": true
```
