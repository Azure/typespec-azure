---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
  - "@azure-tools/typespec-azure-rulesets"
---

Extend existing duplicate client-name validation to compare models, enums, unions,
interfaces, scalars and child namespaces together within each namespace. Conflicting
`@clientName` overrides now produce the existing `duplicate-client-name` error,
including cross-kind collisions in common and language-specific scopes. This is
normal validation, not an opt-in lint warning; no additional lint rule is introduced.
The client SDK ruleset does not need a separate rule registration.
