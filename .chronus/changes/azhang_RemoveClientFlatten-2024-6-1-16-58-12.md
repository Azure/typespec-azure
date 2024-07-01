---
changeKind: breaking
packages:
  - "@azure-tools/typespec-autorest"
  - "@azure-tools/typespec-azure-resource-manager"
---

x-ms-client-flatten extension on some of resource properties property is now configurable to be emitted by autorest emitter. Default is false which will skip emission of that extension.