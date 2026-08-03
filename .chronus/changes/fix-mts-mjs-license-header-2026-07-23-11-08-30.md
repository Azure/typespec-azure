---
# Change versionKind to one of: internal, fix, dependencies, feature, deprecation, breaking
changeKind: fix
packages:
  - "@azure-tools/typespec-ts"
---

Add the license header to emitted `.mts`/`.mjs` files (e.g. the browser and react-native static helper variants such as `get-binary-stream-response-browser.mts`), which were previously skipped because the source-code detection only matched `.ts`/`.js` extensions.
