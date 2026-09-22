---
changeKind: fix
packages:
  - "@azure-tools/typespec-benchmark"
---

Measure compilation separately from full SDK generation: retain 25 compiler measurements and 3 warmups, while each emitter uses 3 measurements and 1 warmup. Run spec/emitter workloads in parallel CI jobs using one prepared build and source snapshot, and restrict noise retries to compilation. Record independent sample counts and per-emitter variability without changing dashboard metric labels.
