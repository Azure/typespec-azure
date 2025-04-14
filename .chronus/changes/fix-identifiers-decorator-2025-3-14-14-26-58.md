---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Fix the `@identifiers` decorator on array models. When the `@identifiers` decorator is explicitly provided, it will take precedence. If the decorator is not present, the model properties with the `@key` decorator will be analyzed. If the keys are not TypeSpec defaults (`name` or `id`), a `x-ms-identifier` will be added for those `@key` values.
