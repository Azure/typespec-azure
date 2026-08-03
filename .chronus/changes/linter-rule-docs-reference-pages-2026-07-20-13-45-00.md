---
changeKind: internal
packages:
  - "@azure-tools/typespec-azure-core"
  - "@azure-tools/typespec-azure-resource-manager"
  - "@azure-tools/typespec-client-generator-core"
---

Migrate linter rule documentation to the tspd `docs` field so `tspd doc` auto-generates the per-rule reference pages. Rule extended docs now live next to each rule in `src/rules/<rule-name>.md` and are referenced via `docs: fileRef.fromPackageRoot(...)`. The generated pages keep their existing location (`libraries/<pkg>/rules/<rule-name>`) via the new `--rules-dir` tspd option, so rule URLs are unchanged. The generated pages are regenerated during the website build and are no longer tracked in git.
