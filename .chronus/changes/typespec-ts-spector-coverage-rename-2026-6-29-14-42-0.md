---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Simplify the test/spector npm scripts now that the TypeScript emitter only produces a single unified (Azure modular) output: drop the redundant `:azure-modular`/`:modular` script-name suffixes and pass-through aliases, remove the dead non-Azure `start-test-server` and the unused `test:azure`/`test:ts:e2e`/`integration-test-ci:sequential` scripts, and rename the spector coverage file to drop `modular` from its name.
