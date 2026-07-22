---
changeKind: internal
packages:
  - "@azure-tools/typespec-go"
  - "@azure-tools/typespec-python"
---

Introduce a standardized opt-in `spector.config.yaml` for selecting which spector tests each emitter generates, loaded by the shared `@azure-tools/spector-config` package. Wire it into the Go (`tspcompile.js`) and Python (`regenerate.ts`) regenerators. No change to the set of generated specs.
