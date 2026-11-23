---
changeKind: fix
packages:
  - "@azure-tools/typespec-benchmark"
---

Warm up the compiler process used for measurements, pin external service inputs and C# dependencies, and separate dashboard baselines by measurement method, source revision and runner hardware. Detect linter noise independently of total compilation time.
