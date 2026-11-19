---
changeKind: fix
packages:
  - "@azure-tools/typespec-breaking-change"
---

Generate phase-appropriate, version-scoped Azure.Core approval codefixes using the shared compiler helper, preserving string escapes and inline insertion targets. Approve deleted same-version operations on their exact surviving interface or namespace with an operation-name path, without approving other removals.