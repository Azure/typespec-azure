---
changeKind: feature
packages:
  - "@azure-tools/typespec-java"
---

Add `@azure-tools/typespec-java`, the Azure (branded) TypeSpec emitter for Java clients. It wraps the unbranded `@typespec/http-client-java` emitter (from the `core/` submodule) and adds Azure-specific emitter options. The emitter sources and the Java `emitter.jar` are built from `core/packages/http-client-java`. This relocates the emitter previously published from `Azure/autorest.java/typespec-extension`.
