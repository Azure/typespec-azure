---
changeKind: feature
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Allow `createTCGCContext` to select an explicit metadata `scope`, including the
exported `AllScopes` symbol for common SDK metadata. Client traversal, relocation,
and naming can now be inspected independently of a language emitter. Omitting
the option preserves emitter-specific behavior.
