---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

`@clientOption`'s `value` can now reference a TypeSpec model, in addition to `string`, `boolean`, and `number` literal values. The referenced model (including customizations such as `@alternateType`) is preserved and resolved so scoped emitters can access it via `getClientOptions`.
