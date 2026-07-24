---
changeKind: internal
packages:
  - "@azure-tools/typespec-python"
---

Use `cross-spawn` instead of `child_process.spawn` in the system requirements setup script. This removes the DEP0190 deprecation warning caused by `shell: true` while keeping support for executing `.cmd`/`.bat` wrappers (e.g. `python.cmd`) on Windows.
