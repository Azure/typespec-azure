---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Speed up the `unit-modular` test suite: migrate the test compile host to the compiler's `createTester` framework so the TypeSpec libraries are loaded once per worker (and the in-memory filesystem cloned per compile) instead of being re-read from disk on every compile, split the monolithic scenario test into per-directory suites for parallelism, trim each scenario's imported library surface to only what it references, add a per-scenario compile cache to avoid recompiling identical TypeSpec inputs across output blocks, lower the test heap from 8 GB to 1 GB, and convert two module-level emitter caches to `WeakMap` to reduce cross-call retention.
