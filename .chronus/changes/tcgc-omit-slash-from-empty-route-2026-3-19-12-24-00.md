---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Add support for `@clientOption("omitSlashFromEmptyRoute", true)` to handle legacy compatibility for operations with empty routes.

When applied to an operation, interface, or namespace, this option converts root path ("/") operations
to use an empty string path ("") instead. This is useful for services like Azure Storage where operations
without an explicit route should not result in a trailing slash when the operation path is concatenated
with the base URL.
