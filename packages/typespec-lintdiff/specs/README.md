# ARM Swagger validator dataset

This directory contains a reusable dataset generated from every ARM TypeSpec
project in `Azure/azure-rest-api-specs` that has:

- a `tspconfig.yaml`;
- a `main.tsp`; and
- the `@azure-tools/typespec-azure-rulesets/resource-manager` ruleset.

`_meta.json` is the authoritative record of the specs commit, included projects,
generation failures and a complete manifest of copied TypeSpec files, Swagger
assets, raw output, common types and normalized result shards.

## Generate the full dataset

The specs clone must have its Node dependencies installed and must have no local
changes. Always pin a commit when generating:

```powershell
pnpm specs:generate `
  --specs-repo C:\dev\azure-rest-api-specs `
  --commit <commit> `
  --concurrency 6
```

An explicit `--commit` always deletes and regenerates the complete dataset.
Running without `--commit` does not inspect or rebuild the specs repo: it reuses
the committed dataset only when `_meta.json`, `validator-results.json` and every
indexed file are present.

For a smaller local run, use `--filter <path-fragment>` or `--limit <count>`.
These filters are recorded in `_meta.json`, so a sample cannot be mistaken for
the full corpus.

## Contents

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
- `validator-results.json`: compact rule index with counts, severity totals and
  the path to each rule's result shard.
- `results/by-rule/<rule>.json`: warning/error/fatal messages for one validator
  rule, including the source project, Swagger file, message and JSON path.

For each project, the harness compiles its original `main.tsp` with
`@azure-tools/typespec-autorest`, selects the newest emitted API date regardless
of stable/preview status, and discards every older emitted version. The copied
TypeSpec source remains alongside that Swagger so later equivalence checks can
run both tools against the same project snapshot.

## Validator behavior

The validator uses the same AutoRest and azure-validator flags as production
LintDiff, but runs directly on each emitted Swagger file. Therefore readme-level
suppression configuration is intentionally not applied; this is recorded in
`_meta.json`.

Raw AutoRest stdout and stderr are preserved unchanged. The normalized
rule shards contain only messages whose level is `warning`, `error`, or `fatal`
and which have a validator rule code. Results are sharded because the full ARM
corpus exceeds GitHub's per-file size limit as one JSON document.
