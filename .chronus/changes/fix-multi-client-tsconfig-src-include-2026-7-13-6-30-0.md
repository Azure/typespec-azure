---
changeKind: fix
packages:
  - "@azure-tools/typespec-ts"
---

Fix multi-client package build failures by syncing the generated `config/tsconfig.src.*.json` `include` lists with the `warp.config.yml` exports, so every client entry point is compiled and emitted to `dist` (previously warp failed with `DIST_MISSING`).
