---
changeKind: internal
packages:
  - "@azure-tools/typespec-java"
---

Copy and patch the Java generator sources from the core submodule during build so the emitter.jar is built from the copy, and pin the desired core commit via core-commit.json.