---
changeKind: fix
packages:
  - "@azure-tools/typespec-client-generator-core"
---

Fix example matching when `@clientLocation` (or `@clientName`) is applied with per-language scope. Example files coming from the swagger/autorest output carry a single canonical `operationId`, but per-language `@clientLocation` overrides previously caused TCGC to resolve a different operation id per emitter, silently breaking example linkage for all languages whose group name didn't match the example file. Example matching now resolves operation ids under the `autorest` scope so a single example file links successfully across all language emitters.
