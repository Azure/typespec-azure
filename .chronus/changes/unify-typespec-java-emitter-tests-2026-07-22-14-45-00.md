---
changeKind: internal
packages:
  - "@azure-tools/typespec-java"
---

Unify the emitter and its e2e tests into a single npm project: `emitter-tests` is no longer a standalone npm project consuming a packed `.tgz`, but part of the `@azure-tools/typespec-java` workspace package. The e2e tests now run against the workspace build via `pnpm run regenerate` / `pnpm run test:java:e2e`, resolving the locally built emitter by package name through Node self-reference (the `emitter-tests` folder has no `package.json`, so `emit: ["@azure-tools/typespec-java"]` in its `tspconfig.yaml` resolves to the parent package).
