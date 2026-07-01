---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Include the fast `test-next` typespec-ts unit suite in the repo-wide vitest run as a cross-package smoke net, while keeping the heavier `unit-modular` suite and the Spector end-to-end integration project out of it. Those still run in the dedicated typespec-ts CI job, which now also triggers on `typespec-client-generator-core` (tcgc) changes so cross-package emit regressions are still caught. Scenario paths in the modular-unit suite now resolve against the package root so they no longer depend on the current working directory.