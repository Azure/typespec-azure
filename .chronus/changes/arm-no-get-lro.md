---
changeKind: feature
packages:
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-client-generator-core"
---

Add opt-in `no-get-lro` rules in ARM and TCGC.

The ARM rule reports GET operations recognized as long-running by the existing
LRO metadata helper, including customized templates and polling/result endpoints.
It also checks explicit LRO extensions. The TCGC rule reports accepted
`Legacy.markAsLro` declarations on GET operations in any SDK scope.

Both rules reuse existing library metadata without a shared declaration bridge.
The ARM rule remains disabled in the ARM library `all` ruleset.
