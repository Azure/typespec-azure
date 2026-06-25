---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Speed up the `unit-modular` test suite: split the monolithic scenario test into per-directory suites for parallelism, add a per-scenario compile cache to avoid recompiling identical TypeSpec inputs across output blocks, lower the test heap from 8 GB to 2 GB, and convert two module-level emitter caches to `WeakMap` to reduce cross-call retention.
