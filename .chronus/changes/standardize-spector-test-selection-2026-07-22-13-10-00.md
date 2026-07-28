---
changeKind: internal
packages:
  - "@azure-tools/typespec-go"
  - "@azure-tools/typespec-python"
  - "@azure-tools/typespec-ts"
  - "@azure-tools/typespec-java"
---

Introduce a standardized opt-in `spector.config.yaml` for selecting which spector tests each emitter generates, loaded by the shared `@azure-tools/spector-runner` package (with a JSON schema generated from TypeSpec). Wire it into the Go (`tspcompile.js`), Python (`regenerate.ts`), TypeScript (`gen-spector.js`) and Java (`Generate.ps1`) regenerators. No change to the set of generated specs.
