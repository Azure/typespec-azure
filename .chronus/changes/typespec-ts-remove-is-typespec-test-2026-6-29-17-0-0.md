---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Remove the internal `is-typespec-test` emitter option. Its only effect was hiding the README "Install the package" section for test packages, so the install section is now always emitted and the option (and the `isReleasablePackage` metadata it gated) has been dropped.
