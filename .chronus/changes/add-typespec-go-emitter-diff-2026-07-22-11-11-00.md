---
changeKind: internal
packages:
  - "@azure-tools/typespec-go"
---

Add `diff-regen-code` script wiring typespec-go into the language-agnostic `emitter-diff` tool to diff all generated test output (`test/http-specs`, `test/azure-http-specs`, and `test/local`) between emitter versions.
