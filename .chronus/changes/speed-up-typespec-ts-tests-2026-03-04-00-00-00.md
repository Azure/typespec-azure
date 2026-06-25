---
changeKind: internal
packages:
  - "@azure-tools/typespec-ts"
---

Speed up the `unit-modular` test suite: run scenario `.md` directories in parallel via one vitest project per leaf scenario directory (computed from the directory tree in `vitest.config.ts`, no generated test files), add a per-scenario compile cache to avoid recompiling identical TypeSpec inputs across output blocks, lower the test heap from 8 GB to 2 GB, and convert two module-level emitter caches to `WeakMap` to reduce cross-call retention.
