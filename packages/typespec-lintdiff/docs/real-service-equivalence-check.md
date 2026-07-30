# Real-service lint equivalence check

A reusable procedure for answering the question the migration depends on:

> **Does the TypeSpec lint rule report the same thing as the Swagger LintDiff rule,
> on a real Azure service?**

The existing evidence in this package does not answer that:

- **Fixtures** (`test/fixtures/`) are hand-authored and synthetic — every
  `main.tsp` uses `Microsoft.TestService` / `TestService`, none is derived from a
  real spec. `output.json`, `tsp-diagnostics.json` and
  `validator-diagnostics.json` are snapshots regenerated from the rule's own
  behaviour (`validate.ts`, `--update-snapshots`), so they record what the rule
  already does, not what it should do.
- **The cross-repo run** (`cross-repo-compare.ts` → `coverage-breakdown.py`)
  reduces both sides to a per-project boolean — "did code X and code Y both
  appear somewhere in this project". Counts, locations and identity are
  discarded, so high parity percentages can coexist with the two rules matching
  entirely different things.

This procedure compares the two toolchains on one real service, using the
**production** Swagger command and the **production** TypeSpec ruleset.

## Procedure

Prerequisites: a clone of `Azure/azure-rest-api-specs` with `npm ci` completed
(this provides both `autorest` and the official `@azure-tools/typespec-*`
packages at the versions the repo actually gates on).

### 1. Pick a TypeSpec-authored ARM service

A project directory containing `tspconfig.yaml` + `main.tsp` whose config
extends `@azure-tools/typespec-azure-rulesets/resource-manager`, and whose
emitted swagger is checked in. At the time of writing there are **467** such
projects.

```powershell
Get-ChildItem specification -Recurse -Filter tspconfig.yaml -File |
  Where-Object {
    (Test-Path (Join-Path $_.DirectoryName 'main.tsp')) -and
    ((Get-Content $_.FullName -Raw) -match 'typespec-azure-rulesets/resource-manager')
  }
```

### 2. Run the Swagger linter exactly as CI does

Mirror `eng/tools/lint-diff/src/runChecks.ts`. Do **not** hand-roll a Spectral
invocation — see [Pitfalls](#pitfalls-do-not-hand-roll-the-swagger-side).

```powershell
$dep = Resolve-Path node_modules\@microsoft.azure\openapi-validator
npm exec -- autorest --v3 --spectral --azure-validator `
  --semantic-validator=false --model-validator=false --message-format=json `
  --openapi-type=arm --openapi-subtype=arm --use=$dep `
  --tag=<tag> <path-to-readme.md> > autorest.txt
```

Each stdout line is a JSON message; violations are the ones with
`level` of `warning` / `error` / `fatal`, carrying `code` and
`details.jsonpath`.

```js
const objs = fs.readFileSync("autorest.txt", "utf8").split(/\r?\n/)
  .filter((l) => l.trim().startsWith("{"))
  .map((l) => { try { return JSON.parse(l); } catch { return null; } })
  .filter(Boolean);
const violations = objs.filter((o) => ["warning", "error", "fatal"].includes(o.level));
```

### 3. Run the TypeSpec linter on the same project

```powershell
cd <project-dir>
node_modules\.bin\tsp.cmd compile . --no-emit --pretty false
```

The linter configuration comes from the project's own `tspconfig.yaml`, so this
is the ruleset the service is actually gated on today.

### 4. Compare

Compare **counts per rule** and, where the rule shape allows, **locations**: the
validator's `details.jsonpath` (`["definitions","Widget","properties","flag"]`)
and the TypeSpec diagnostic target both reduce to `(model, property)`. Report the
**symmetric difference**, not a percentage — a diff is actionable, "99.6%" is not.

## Worked example: Microsoft.Fabric

`specification/fabric/resource-manager/Microsoft.Fabric/Fabric`, tag
`package-2023-11-01`, emitted swagger `stable/2023-11-01/fabric.json`.
Fully TypeSpec-authored.

**Swagger side — 53 violations across 3 rules (5 errors, 48 warnings):**

| Count | Level | Rule | `catalog.json` tier | Mapped TypeSpec lint |
|---:|---|---|---|---|
| 48 | warning | `LatestVersionOfCommonTypesMustBeUsed` | Unconstrained | `tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used` (`coverageKind: lint`) |
| 3 | error | `PatchBodyParametersSchema` | Unconstrained | `tsp-lintdiff-local-linter/patch-body-parameters-schema` (`coverageKind: partial`) |
| 2 | error | `RequiredPropertiesMissingInResourceModel` | **Template-enforced** | `tspLints: []` |

**TypeSpec side — 0 diagnostics.** `Compilation completed successfully.`

### What that shows

1. **A "Template-enforced" rule fires on real TypeSpec output.**
   `RequiredPropertiesMissingInResourceModel` is classified as needing no work,
   rationale *"ARM library base models (TrackedResource/ProxyResource) provide
   name, id, type as readonly"* — yet it reports 2 errors on
   `RpSkuEnumerationForNewResourceResult`, and has no mapped TypeSpec lint. The
   tier values in `catalog.json` come from the hand-written
   `test/harness/triage-data.ts`; this is a counter-example found on the first
   service tried, so the 43-rule Template-enforced tier should be spot-checked
   against real services before it is used to remove rules from scope.

2. **Migrated ≠ enforced.** `LatestVersionOfCommonTypesMustBeUsed` *has* been
   migrated, but into `tsp-lintdiff-local-linter`, which no spec repo
   references — so it catches 0 of the 48 real findings.

## Pitfalls: do not hand-roll the Swagger side

Linting the same file three ways gives three different answers:

| Configuration | Violations | Distinct rules | Errors |
|---|---:|---:|---:|
| Production `autorest` (step 2 above) | **53** | **3** | 5 |
| Spectral directly, `$ref`s resolved | 82 | 13 | 7 |
| Spectral directly, `$ref`s unresolved | **202** | **23** | 49 |

The third row is what `cross-repo-compare.ts` currently does. Three causes:

- **No `$ref` resolution.** `runSpectralRules()` calls `linter.run(swagger)` on a
  plain parsed object with no document source, so external `$ref`s into
  common-types never resolve. Rules that inspect referenced content then fire on
  `{ $ref: … }` placeholders. For this one spec that manufactures ~150 phantom
  violations, including every `invalid-ref`, `ApiVersionParameterRequired`,
  `NamePropertyDefinitionInParameter`, `ParameterDescription` and `VersionPolicy`
  finding — the same rules that show implausible ~445/450 firing rates in the
  coverage report. To resolve, construct a `Document` with a source path and pass
  `httpAndFileResolver`.
- **Wrong ruleset scope.** All three rulesets are loaded — `azARM` (81 rules),
  `azCommon` (38) and `azDataplane` (37) — regardless of service type; the
  `serviceType` argument is ignored on the spectral path. Data-plane rules are
  therefore applied to ARM specs.
- **Suppressions ignored.** readme-level `suppressions:` are not honoured.
  Fabric suppresses `PostResponseCodes`; production reports none, the harness
  reports two.

Consequence: `Fired` counts in the coverage report are measured against a
validator configuration that differs materially from the one gating the specs
repo, so both the parity percentages and the needs-migration classification that
derives from them should be regenerated with the production command.

## Suggested follow-ups

- Run this across ~10–20 services to establish whether "validator N, TypeSpec 0"
  is systematic or specific to Fabric.
- Switch the harness's validator side to the production `autorest` invocation, or
  at minimum fix resolution, ruleset scoping and suppressions.
- Add a per-rule equivalence mode that reports the symmetric difference of
  `(model, property)` locations rather than a project-level boolean.
- Seed fixtures from real specs: for each rule, take a project where the
  validator fires, extract the minimal TypeSpec that reproduces it, and commit
  that as the fixture — so the offline corpus and the real-world corpus test the
  same thing.
