---
changeKind: internal
packages:
  - "@azure-tools/typespec-autorest"
  - "@azure-tools/typespec-autorest-canonical"
  - "@azure-tools/typespec-azure-portal-core"
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-client-generator-core"
  - "@azure-tools/typespec-go"
  - "@azure-tools/typespec-java"
  - "@azure-tools/typespec-ts"
---

Replace `npm`/`npx` usage in build and test scripts with `pnpm` equivalents to stop `npm warn Unknown env config` warnings when running inside the pnpm workspace.
