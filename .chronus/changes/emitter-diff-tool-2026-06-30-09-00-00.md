---
changeKind: internal
packages:
  - "@azure-tools/typespec-python"
---

Add optional `--emitter-dir`, `--output-dir`, `--http-specs-dir`, `--azure-specs-dir` and `--use-pyodide` overrides to the `regenerate` script (defaults preserve existing behavior). These let the new repo-level `emitter-diff` tool drive generation with an arbitrary emitter build and output location so it can diff generated code across emitter versions; `--use-pyodide` forces WASM generation for environments where the native Python toolchain (e.g. the black formatter) cannot run.
