---
changeKind: fix
packages:
  - "@azure-tools/typespec-autorest"
---

Fix using `@identifiers` decorator on array models where the name is not properly processed,considering that `name` is not a default value of [x-ms-identifier](https://azure.github.io/autorest/extensions/#x-ms-identifiers).
