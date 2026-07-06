---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Clean up vestigial RLC technical debt in the emitter now that only Modular generation is supported: remove the dead `rlc-common` subfolder and relocate its live code into the main source tree, de-RLC internal type/function names (for example `RLCModel` -> `ClientModel`, `ModularClientOptions` -> `ClientModuleInfo`), decouple the client code model build from source generation, collapse the redundant `modularSourcesDir`, remove the dead `compatibility-query-multi-format` emitter option, and refresh the README and CONTRIBUTING docs. No changes to the generated output.
