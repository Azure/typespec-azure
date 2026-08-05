---
changeKind: internal
packages:
  - "@azure-tools/typespec-java"
---

Skip Spotless formatting during the Java emitter build so transient Eclipse download failures do not fail `pnpm build`.
