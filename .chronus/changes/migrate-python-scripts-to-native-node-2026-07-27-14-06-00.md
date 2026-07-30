---
changeKind: internal
packages:
  - "@azure-tools/typespec-python"
---

Migrate the Python emitter's build/dev scripts from `tsx` to native Node.js TypeScript execution. `tsx script.ts` invocations are now `node script.ts` (relying on Node's built-in type-stripping), sibling relative imports use explicit `.ts` extensions, and type-only imports are marked with `type`. The unused `tsx` dependency was removed.
