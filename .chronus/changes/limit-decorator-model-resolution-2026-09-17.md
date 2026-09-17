---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Limit SDK type resolution for model-valued decorator arguments to `@clientOption`, preventing unrelated decorators from adding models to SDK type discovery.
