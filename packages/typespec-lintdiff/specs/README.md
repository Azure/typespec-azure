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

## Add TypeSpec results

Run the additive TypeSpec analysis only after a spec dataset exists:

```powershell
pnpm specs:typespec `
  --specs-repo C:\dev\azure-rest-api-specs `
  --concurrency 6
```

For the pinned 468-project corpus at
`f6b53f105b95da05276530a0754a1c71b4f16397`, the full run with concurrency 6
took 695,905 ms (11 minutes 35.9 seconds) inside the harness and 699,740 ms
(11 minutes 39.7 seconds) wall-clock. Six projects had compile errors and were
recorded as unassessed.

For a scoped run that writes to the same standard result locations:

```powershell
pnpm specs:typespec `
  --specs-repo C:\dev\azure-rest-api-specs `
  --filter specification/advisor/resource-manager/Microsoft.Advisor/Advisor `
  --limit 1 `
  --concurrency 1
```

The command always selects projects from the existing `_meta.json`; it does not
regenerate Swagger. `--filter` matches the recorded source path and `--limit`
caps the selected projects. Scoped and full runs use the same files and folder
structure. A scoped run records `partial: true` and its filters; a later full run
replaces those TypeSpec results and records `partial: false`.

The command verifies that the specs clone is clean, temporarily checks out the
recorded commit, builds and links this package as
`tsp-lintdiff-local-linter`, and adds
`tsp-lintdiff-local-linter/all` to a temporary copy of each project's existing
`tspconfig.yaml`. Official rulesets and other linter settings remain enabled.
Compilation uses `--no-emit`, so Swagger generation and validation are not
repeated. Temporary configs are deleted and the specs clone's original ref is
restored.

The additive files are:

- `typespec-results.json`: rule index and per-project compile status.
- `results/by-typespec-rule/<encoded-rule>.json`: normalized diagnostics,
  including origin, severity, source location and full message.
- `comparison-results.json` and `comparison-results.md`: project-level overlap
  between every known validator rule and the `tspLints` mappings in fixture
  frontmatter, plus TypeSpec rules that have no mapping. The known-rule set is
  the union of the validator metadata catalog, fixtures, and dataset results, so
  rules that did not fire are retained with zero counts.
- `coverage-breakdown.json` and `coverage-breakdown.md`: an observed full-rule
  coverage summary grouped into 100%, partial, zero, unmapped, never-fired,
  TypeSpec-only, and unassessed sections. Fixture `coverageKind` and official
  `@azure-tools/` mappings are shown as context, but mappings receive no
  coverage credit unless a mapped diagnostic overlaps the validator rule in the
  same successfully compiled project.
- `projects/<spec-path>/raw/typespec.stdout.txt` and
  `typespec.stderr.txt`: complete TypeSpec CLI output for each project.

Validator projects are **assessable** only when their TypeSpec compilation
succeeds. A failed project is listed as **unassessed** for each validator rule
that fired there and is excluded from overlap, gap, TypeSpec-only, and observed
coverage calculations. Observed coverage is overlap divided by assessable
validator projects; it is unavailable when no validator projects are
assessable. Diagnostics from failed projects remain available in raw output and
normalized TypeSpec shards for debugging.

`_meta.json` keeps schema version 4 and receives a separate
`typespecAnalysis` object. It records the analysis schema version, counts,
selected-project filters, generated files, local git revision, and a SHA-256
fingerprint over the local linter's source and package/TypeScript configuration.
The complete analysis duration, including local build/link, compilation,
aggregation, and report writing as closely as practical, is persisted as
`durationMs` in both `typespec-results.json` and `_meta.json`'s
`typespecAnalysis` object and is displayed in the Markdown reports.
The original dataset cache remains reusable; compare the fingerprint before
reusing TypeSpec results after local linter changes. Only
`results/by-typespec-rule` is removed before shards are rewritten, so validator
results are left untouched. Comparison counts are filtered to the same selected
projects.
