---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Include the typespec-ts unit tests (`test-next` + `unit-modular`) in the repo-wide vitest run while keeping the Spector end-to-end integration project out of it. Scenario paths in the modular-unit suite now resolve against the package root so they no longer depend on the current working directory.