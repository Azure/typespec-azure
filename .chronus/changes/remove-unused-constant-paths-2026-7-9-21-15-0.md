---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Remove the now-obsolete `//metadata.constantPaths` `userAgentInfo` generation and the `clientContextPaths` plumbing that fed it. Since the user-agent version is now read dynamically from `package.json` at runtime, there is no burned-in version constant for `dev-tool` to bump.
