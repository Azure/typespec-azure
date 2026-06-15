---
changeKind: feature
packages:
  - "@azure-tools/typespec-go"
---

Move `@azure-tools/typespec-go` from `Azure/autorest.go` into `Azure/typespec-azure`. The previously-private workspace packages `@azure-tools/codegen.go`, `@azure-tools/codemodel.go`, and `@azure-tools/naming.go` are now inlined into `src/codegen`, `src/codemodel`, and `src/naming` respectively. No behavior changes for emitter consumers.
