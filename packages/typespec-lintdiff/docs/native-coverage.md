# Official-library coverage analysis

`coverage:native` compares an official TypeSpec Azure rule with a Swagger
validator on real specs. It uses the candidate checkout's `tsp-integration` to
inject built package artifacts. It never copies the rule into the temporary
lintdiff library.

Use the repository skill
[`analyze-native-lint-coverage`](../../../.github/skills/analyze-native-lint-coverage/SKILL.md)
for preparation, source/PR selection, package packing, execution, and gap
investigation.

## Design

The caller selects fresh candidate/specs checkouts and compatible build inputs.
The tool records their current commits and candidate artifact hashes at run
start, then generates new Swagger evidence for that exact specs commit.
No historical specs commit or registry version is a permanent default.

The same candidate package artifacts supply the emitter and official lint.
Native compilation runs in a separate process per project and resolves the
compiler, HTTP/versioning libraries, and lint package from the specs checkout.
This prevents the tooling checkout's compiler from silently evaluating a
candidate built for a different TypeSpec version.

Explicit rule activation is local to the comparison. Existing source suppressions
and directly configured/inherited rule options remain effective. Raw diagnostics
are retained before optional selected-version
HTTP location alignment. The boolean profile uses native boolean metadata;
it does not match common property names between unrelated models.

Each selected project receives a receipt. Swagger compile failures, validator
failures, native compile failures, and worker/projection failures are unassessed,
not compliant or covered. The report includes raw unassessed validator counts.
An incomplete run exits nonzero after writing available comparison evidence.

Project coverage measures observed overlap only. Raw validator occurrences,
file-independent JSON paths, raw native diagnostics, and distinct native source
targets remain separate measures. The tool reports positive and negative count
differences separately and does not decide semantic equivalence.

## Validation

```powershell
mise exec -- pnpm --dir packages\typespec-lintdiff exec vitest run test\harness\native-coverage.test.ts
```

The tests cover strict arguments, explicit mappings, failure accounting,
one-sided populations, zero-denominator coverage, duplicate source targets,
locationless diagnostics, and conservative cardinality identities.

Set `NATIVE_COVERAGE_SPECS_REPO` to an artifact-injected specs checkout and include
`test\harness\native-coverage-worker.test.ts` for runtime controls. Those controls
are skipped without that checkout. They cover violating/compliant inputs,
explicit activation, configuration disablement, source suppression, missing
native/upstream rules, and two selected API versions with removed/type-changed
boolean properties. They do not rely on the tooling checkout's compiler.

## PR #5265 pilot

PR [#5265](https://github.com/Azure/typespec-azure/pull/5265) maps
`EnumInsteadOfBoolean` to Azure Core `no-boolean`. The following are observations
from a fresh run, **not permanent input pins or full-corpus equivalence evidence**.

| Input                                       | Resolved identity                          |
| ------------------------------------------- | ------------------------------------------ |
| Candidate canonical `main` containing #5265 | `d212c494e90f880c9dc729ec5ff575e4691172d2` |
| Candidate `core` gitlink                    | `cf8712b9957d4a25d7c6cd338e42e7bffaf9f98a` |
| Specs `typespec-next`                       | `2cd3c5dd6d00a5f53214fe594afd2aef3f44d3f9` |
| Node / specs-declared pnpm                  | `26.5.0` / `12.6.0`                        |
| Runtime compiler / HTTP                     | `1.17.0` / `1.17.0`                        |
| Runtime Azure Core / AutoRest emitter       | `0.73.0` / `0.73.1`                        |
| Runtime versioning                          | `0.87.0`                                   |
| AutoRest launcher / validator / rulesets    | `3.8.0` / `2.2.4` / `2.2.6`                |

Preparation used the candidate's own dependency closure:

```powershell
mise exec -- pnpm install --filter . --filter ./core `
  --filter '@azure-tools/typespec-azure-rulesets...' `
  --filter '@azure-tools/typespec-autorest...' `
  --filter '@typespec/integration-tester...' --frozen-lockfile --ignore-scripts
mise exec -- pnpm -r --filter '@azure-tools/typespec-azure-rulesets...' `
  --filter '@azure-tools/typespec-autorest...' `
  --filter '@typespec/integration-tester...' build
```

Chronus packed Azure AutoRest, Azure Core, Azure Examples, Resource Manager,
Azure Rulesets and Client Generator Core. The matching core artifacts were
compiler, asset-emitter, events, HTTP, JSON Schema, OpenAPI, REST, SSE, streams,
versioning and XML. Use repeated `--only <package>` selectors with
`chronus pack --pack-destination <directory>` from the respective workspace.
The run manifest records every tarball's SHA-256; worker receipts record the
actual installed entrypoints, versions and entrypoint SHA-256 values.

With the specs-declared package manager on `PATH`, from the tooling package:

```powershell
node --import tsx/esm test\harness\native-coverage.ts `
  --candidate-repo <fresh-candidate-checkout> `
  --specs-repo <fresh-specs-checkout> `
  --tgz-dir <packed-candidate-artifacts> `
  --validator-rule EnumInsteadOfBoolean `
  --tsp-rule @azure-tools/typespec-azure-core/no-boolean `
  --scope boolean-http --limit 8 --concurrency 4 `
  --output <new-run-directory>
```

This selected the first eight projects discovered by the existing ARM generator,
not a random or representative full-corpus sample:

| Project                        | Selected API version | Swagger raw | Native raw | Native aligned | Native source targets |
| ------------------------------ | -------------------- | ----------: | ---------: | -------------: | --------------------: |
| Advisor                        | `2026-08-01-preview` |           2 |          3 |              2 |                     2 |
| AgriculturePlatform.Management | `2024-06-01-preview` |           1 |          1 |              1 |                     1 |
| AlertProcessingRules           | `2021-08-08`         |           2 |          2 |              2 |                     2 |
| AlertRuleRecommendations       | `2023-08-01-preview` |           0 |          0 |              0 |                     0 |
| AlertsManagement               | `2025-05-25-preview` |           6 |         11 |             11 |                     6 |
| PreviewAlertRule               | `2025-07-01-preview` |           3 |          3 |              3 |                     3 |
| PrometheusRuleGroups           | `2023-03-01`         |           4 |          4 |              4 |                     4 |
| TenantActivityLogAlerts        | `2023-04-01-preview` |           2 |          2 |              2 |                     2 |
| **Total**                      |                      |      **20** |     **26** |         **25** |                **20** |

All eight projects were assessable. Seven violation-bearing projects overlapped;
neither tool had a one-sided project. Observed validator-project coverage was
100%, with zero count excess in either direction after conservative source
deduplication. All projects had zero target findings under their normal defaults.
The positive comparison therefore depends on explicit opt-in, not a production
ruleset change.

Advisor's extra raw finding targets `models.tsp:749`, the boolean `tracked`
property removed in `2026-02-01-preview`. It is absent from the selected
`2026-08-01-preview` HTTP graph. AlertsManagement retains eleven raw findings but
only six source locations. Five locations occur twice: `Alert.tsp:195`,
`Alert.tsp:201`, `Alert.tsp:319`, `Alert.tsp:325`, and `routes.tsp:55`.
All raw occurrences remain available; the analyzer does not rewrite the rule
or claim a one-to-one identity mapping between JSON paths and source targets.

The pilot also exposed two reused-generator problems: AutoRest misread a
Windows local validator path as a package reference, and emission updated
the specs' `service.yaml`. The generator now uses a file URL and disables
service metadata emission. Regression tests cover both; a completed run checks
that candidate/specs source checkouts are still clean and at their initial SHAs.

The result supports project-level and conservative count parity **for this
sample**. It does not establish arbitrary diagnostic-level equivalence, all-version
equivalence, or full-corpus coverage. The tool continues to return
`equivalence: "not-determined"`. A full assessment must omit `--limit`, inspect
both one-sided sets and both count-excess directions, and investigate failures.
The source-location profile is not a general substitute for reevaluating
version-sensitive predicates on projected types.

AutoRest's core engine is selected by its existing `--v3` resolution, separately
from the recorded launcher and validator packages. Raw logs retain that resolution.
The manifest does not yet provide a complete transitive dependency lock or
automatically attest source-to-tarball provenance. Retain build/pack logs and the
run's installed dependency store for strict replay. Normal external-integration
and base-versus-PR regression checks remain separate required gates.
