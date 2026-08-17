---
changeKind: fix
packages:
  - "@azure-tools/typespec-python"
---

Ship the install/prepare setup scripts as native ESM `.js` instead of raw `.ts` so the emitter runs correctly when installed as a dependency. Node.js refuses to type-strip `.ts` files under `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`), which broke consumers of 0.63.4+.
