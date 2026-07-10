---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Read the client user-agent version dynamically from the generated `package.json` at runtime (via the package's own `./package.json` export) instead of hardcoding the emitter's `package-details.version` into the generated source.
