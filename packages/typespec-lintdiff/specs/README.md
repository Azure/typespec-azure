# ARM Swagger validator dataset

This directory contains a reusable dataset generated from ARM TypeSpec projects
in `Azure/azure-rest-api-specs`.

Generate it from an explicit specs commit:

```powershell
pnpm specs:generate `
  --specs-repo C:\dev\azure-rest-api-specs `
  --commit <commit>
```

An explicit `--commit` always regenerates the complete dataset. Running without
`--commit` reuses it only when a complete `_meta.json` and
`validator-results.json` already exist.

The layout is:

- `_meta.json`: commit, filters, project list, generation status and file index.
- `projects/<spec-path>/`: one folder per ARM TypeSpec project.
  - `typespec/`: the complete project source, excluding checked-in generated
    Swagger and temporary/build output.
  - `swagger/`: only the newest emitted API version by date, regardless of
    stable or preview status, together with that version's examples.
  - `raw/`: untouched AutoRest stdout (`.jsonl`) and stderr for that Swagger.
- `common-types/resource-management/`: the commit's ARM common-types files, so
  emitted `$ref`s remain portable with the dataset without duplicating common
  types under every project.
- `validator-results.json`: warning/error/fatal messages grouped by validator
  rule, including the source project, Swagger file, message and JSON path.

The validator uses the same AutoRest and azure-validator flags as production
LintDiff, but runs directly on each emitted Swagger file. Therefore readme-level
suppression configuration is intentionally not applied; this is recorded in
`_meta.json`.

For a review-sized sample, use `--filter` or `--limit`. The committed sample is
not the complete ARM corpus and its filters are recorded in `_meta.json`.
