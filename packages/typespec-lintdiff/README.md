# tsp-lintdiff-local-linter

Native TypeSpec lint rules migrated from **Swagger LintDiff / `azure-openapi-validator`**, plus
the equivalence-validation harness, test-fixture corpus, and the coverage catalog that make the
migration decisions auditable.

> **Handoff note.** This package was migrated from the experimentation repo
> [`catalinaperalta/tsp-lintdiff-migration`](https://github.com/catalinaperalta/tsp-lintdiff-migration)
> (source branch `caperal/addtl-arm-rules`, provenance commit `3a2e41b`). It is checked in **as-is**
> to continue the work inside `typespec-azure`. See _Open items_ below before hardening it.

## What's here

| Path | Contents |
|------|----------|
| `src/` | The linter: `index.ts`, `lib.ts`, `linter.ts`, and **67 rule files** under `src/rules/`. |
| `test/fixtures/` | **212** rule test-case directories (`<RuleName>/rule.md` + per-case `main.tsp`, emitted `output.json`, `expect.json`, `tsp-diagnostics.json`, `validator-diagnostics.json`). |
| `test/harness/` | The validation/comparison harness (`validate.ts`, `cross-repo-*.ts`, `audit-*.ts`, `catalog.ts`, `generate/sync-rule-metadata.ts`, `analyze-noise.ts`, `compile-worker.ts`, `lib/`) and Python coverage helpers. |
| `catalog/` | Coverage catalog: `CATALOG.md`, `catalog.json` (209 validator rules), `validator-rule-metadata.json`, `rule-metadata-audit.json`. |
| `docs/` | `DESIGN.md`, `ONBOARDING.md`, `SUMMARY.md`, `validate-report.md`. |

> The deeper analysis notes (phase reports, equivalence analysis, non-migrated / non-template /
> broader-coverage rationale, future work) live in the source repo
> [`catalinaperalta/tsp-lintdiff-migration`](https://github.com/catalinaperalta/tsp-lintdiff-migration)
> under `notes/` and are intentionally **not** carried into this branch. Pull them in separately if
> the team decides they belong here.

Related project skills live at the repo root under `.github/skills/`
(`typespec-lint-*`, `lintdiff-*`) and are referenced from `.github/copilot-instructions.md`.

## Migration status (from `docs/validate-report.md`)

- 223 total test cases · 33 direct native lints · 5 template-only · 1 partial · 89 confirmed gaps ·
  32 possible gaps · plus test-quality buckets.
- Covered-rule confidence and per-rule rationale, plus rules intentionally **not** migrated
  (template-enforced / infallible / concept-not-applicable), are documented in the source repo's
  `notes/` (`phase1-assessment-report.md`, `phase2b-equivalence-analysis.md`,
  `non-migrated-rules.md`).

## Building

The package builds with the monorepo toolchain (mise + pnpm):

```
mise exec -- pnpm -r --filter "tsp-lintdiff-local-linter..." build
```

The rules depend on `@typespec/compiler`, `@typespec/http`, `@typespec/openapi`,
`@typespec/versioning`, `@azure-tools/typespec-azure-core`, and
`@azure-tools/typespec-azure-resource-manager` (all workspace packages).

## Running the harness

The harness compiles each TypeSpec fixture, emits OpenAPI, runs `azure-openapi-validator`, and
compares validator diagnostics against the verified TypeSpec diagnostics for each rule.

```
npm run validate                 # full corpus
npm run validate -- <RuleName>   # single rule
npm run validate -- --report-md  # regenerate docs/validate-report.md style output
npm run audit:coverage
npm run audit:noise
npm run catalog                  # regenerate catalog/CATALOG.md + catalog.json
```

### External setup required (carried over as-is)

Two inputs are **not** vendored in this repo and must be provided before `validate`/`compare`/
`catalog` will run. Either run `npm run compare:setup -- --specs-repo <path>` (which populates them)
or point the harness at existing checkouts via environment variables:

- `LINTDIFF_VALIDATOR_ROOT` → an `azure-openapi-validator` checkout (validator rule source/docs).
- `LINTDIFF_COMMON_TYPES` → ARM `common-types` TypeSpec sources used when compiling fixtures.

## Open items for the next developer

1. **Package / library naming.** The npm package and the TypeSpec library id are both
   `tsp-lintdiff-local-linter` (kept identical so diagnostic IDs, the `.../all` ruleset, npm-link,
   and all 212 fixtures stay aligned). Renaming to the native `@azure-tools/typespec-lintdiff`
   requires a coordinated rename of the `$lib` name, fixture `expect.json`/`rule.md` diagnostic
   prefixes, and harness references — do it as one pass, then regenerate snapshots.
2. **Test idiom.** Coverage is proven via the swagger-comparison harness. The `typespec-azure`
   convention is `vitest` + `createLinterRuleTester` (see other packages' `test/rules/`). Adding
   native rule-tester tests per rule is recommended follow-up; both can coexist.
3. **Equivalence duplicates.** Several of the 67 rules restate existing upstream ARM/core lints
   (see the source repo's `notes/phase2b-equivalence-analysis.md`). A dedupe pass — deciding which rules should
   fold into `typespec-azure-resource-manager` / `typespec-azure-core` vs. stay here — is
   intentionally deferred.
4. **Catalog portability.** `catalog/catalog.json` contains absolute `docPath` values from the
   original author's machine. Regenerate with `npm run catalog` (with `LINTDIFF_VALIDATOR_ROOT`
   set) to make them portable.
5. **Chronus changelog.** Per repo convention, add a change entry (`pnpm change add`) before
   opening a PR, and do not commit the `core` submodule or `pnpm-lock.yaml` unless intended.
