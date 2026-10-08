# LroExtension migration

## Result and gap summary

The fresh 468-project ARM comparison reports **39 Swagger diagnostics in 14
projects versus 14 native diagnostics in five projects**: five shared projects,
nine validator-only, and no TypeSpec-only projects. The 25 excluded occurrences
are 14 POST, six PUT, and five DELETE operations outside the supported native
contract: registered resource/template cases already have official enforcement
or legacy prerequisites, and two handwritten POSTs suppress interface and
Location-header requirements. They are not supported-provider misses.

The completed update checks supported PATCH and provider/collection POST
customizations returning `202` without native polling metadata. Fourteen native
tests and all 51 affected fixtures pass. Six unrelated, pre-existing compiler
failures limit the assessed corpus to 462 projects; none prevents assessment of
the 14 Swagger-firing projects. No unexplained in-contract discrepancy remains.
This is **partial Swagger coverage**, not universal equivalence or all-version
parity. The [population accounting](#fresh-full-corpus-results) explains the
intentional exclusions separately from the supported-shape evidence.

## Native contract and official coverage

The [rule contract and shape matrix](./rule.md#native-rule-contract) define the
population and authored diagnostic target. The rule checks compiler/HTTP/ARM/Core
semantics directly: exact `202`, PATCH or POST marked by `isArmCollectionAction`,
and absent `getLroMetadata`. It does not read OpenAPI extensions, generated
references, SDK metadata, or emitter state. Each operation receives at most one
warning even when multiple response alternatives contain `202` or overlapping
parent/child service traversals contain the same semantic operation. Distinct
operations sharing response types remain separate diagnostic targets.

The official maintained resource-manager ruleset, not ARM/all plus Core/all,
accepted the seven public-template cases in the rule-local matrix with zero
compiler and lint diagnostics. Four plain-Location customizations lacked native
LRO metadata; three semantic-header controls had it. This established **partial**
existing coverage and a supported, actionable gap before implementation:

- `arm-post-operation-response-codes` traverses `getArmResources`, including
  registered lifecycle and resource-instance action operations. Its sync check
  rejects `202` when native LRO metadata is absent.
- `arm-put-operation-response-codes` rejects registered PUT response sets
  containing `202`.
- `arm-delete-operation-response-codes` rejects synchronous registered DELETE
  response sets containing `202`.
- `lro-location-header` checks only the presence of a header named Location,
  case-insensitively, for exact `202`. It does not establish polling semantics.
- Provider templates carry ARM collection-action metadata but are outside the
  registered resource-instance operations checked by the POST rule.

These conclusions follow the official implementations in
`packages/typespec-azure-resource-manager/src/rules`, the public operation
templates in `lib/operations.tsp`, and the recommended custom PATCH/provider
operation examples in the ARM resource-operations and long-running-operations
guides. Catalog applicability Both does not expand this ARM migration into a
data-plane rule.

## Focused validation and emission evidence

The native suite contains 14 tests, runs without AutoRest or TCGC, and proves:

- sync PATCH accepted-response customization and async PATCH plain-header
  customization each report on the authored operation;
- sync/async provider POST plain-header customizations report even though they
  are outside registered resource operations;
- standard/semantic-header PATCH and provider templates pass;
- synchronous templates without `202` pass;
- the lintdiff-only service guard reaches nested ARM operations and excludes
  a data-plane PATCH with `202`;
- a nested ARM service operation included by recursive parent and child HTTP
  service traversals receives exactly one warning;
- two provider operations sharing header types each receive exactly one warning.

Independent precommit review identified the overlapping-service duplicate using
public ARM provider templates with distinct parent/child Operations routes.
The maintained resource-manager ruleset and compiler reported zero diagnostics,
while the original traversal reported twice on one authored provider action.
Operation-identity deduplication reduces that supported reproducer to one
warning. This is a rule-owned diagnostic-unit regression, not a test of compiler
service enumeration or a change to the native applicability predicate.

The documentation's actual incorrect/correct PATCH operation shapes are used in
both native tests and full ARM comparison fixtures, with only service/resource
setup and ordinary companion CRUD operations added. The target rule is enabled.
The incorrect example emits one target warning; the semantic-header correction
emits none.

| Fixture                             | Native target warnings | Swagger LroExtension violations | Disposition                                                |
| ----------------------------------- | ---------------------: | ------------------------------: | ---------------------------------------------------------- |
| `custom-patch-sync-plain-location`  |                      1 |                               1 | Supported uncovered customization                          |
| `custom-patch-async-plain-location` |                      1 |                               1 | Supported uncovered customization                          |
| `custom-patch-semantic-location`    |                      0 |                               0 | Correct semantic headers                                   |
| `provider-sync-plain-location`      |                      1 |                               1 | Supported uncovered customization                          |
| `provider-async-plain-location`     |                      1 |                               1 | Supported uncovered customization                          |
| `provider-semantic-location`        |                      0 |                               0 | Correct standard provider template                         |
| `compliant-with-template`           |                      0 |                               0 | Standard async PATCH/DELETE and sync POST                  |
| `missing-lro-for-202`               |                      0 |                               1 | Registered POST status-code prerequisite suppressed        |
| `false-lro-extension`               |                      0 |                               1 | Registered POST and no-openapi prerequisites suppressed    |
| `with-lro-extension`                |                      0 |                               0 | Comparison-only emitted override; registered POST excluded |

AutoRest research explains the emitted-field difference without implementing it
in the lint. `src/openapi.ts` emits the LRO extension when Core `getLroMetadata`
is present on a non-GET operation; it also recognizes the SDK legacy mark and
finally attaches explicit OpenAPI extensions. Plain header names alone do not
enter the native-metadata branch. Native runtime uses only the semantic API.

The four complete affected fixture groups passed strictly: LroExtension (10),
ConsistentResponseSchemaForPut (13), ConsistentPatchProperties (23), and
XmsPageableMustHaveCorrespondingResponse (5). Updates were limited to explained
LRO message/order changes, removal of the redundant PUT warning, the newly
diagnosed legacy-extension PATCH comparison, and current-target casing of two
existing naming messages. The pageable fixture's ambient expectation omitted
those two naming codes even though both were already in its HEAD snapshot;
the proof was reconciled without changing or suppressing any rule.

The two new compliant fixtures explicitly account for ambient lintdiff-only
warnings (old common-types version, path length, and examples); they contain
neither target LRO warnings nor official ARM/Core diagnostics.

## Concrete native and parity differences

### Plain Location is not polling metadata

The incorrect `ArmCustomPatchAsync` example in [rule.md](./rule.md) replaces
`LroHeaders` with `PlainLocationHeaders`. Its standard `202` response remains,
but Core cannot resolve the polling/final-result metadata. The maintained
Location-header rule passes while the native rule reports. Restoring
`ArmLroLocationHeader<FinalResult = Widget>` fixes the actual missing semantics,
not merely the emitted boolean.

Provider customizations have the same issue. For example, the retained Advisor
source `routes.tsp` uses `ArmProviderActionSync<Scope = SubscriptionActionScope,
Response = ArmAcceptedResponse & { @header("Location") Location: string; }>`.
That route is a provider/collection action, not a resource-instance POST.
The supported provider fixture reproduces this cause without its conversion
suppressions.

### Registered resource operations already have official enforcement

`missing-lro-for-202` deliberately suppresses
`arm-post-operation-response-codes` on a registered resource action returning
`202`. The validator sees its absent emitted extension, but the native rule
does not duplicate the official POST response check. Its zero local warnings are
an intentional exclusion, not evidence that a supported provider action passes.

Real-service examples include API Management's `reconnect` resource action
(`BackendContract.tsp`), Attestation's `ArmResourceDeleteSync` response override
(`AttestationProvider.tsp`), and Relay's `ArmResourceCreateOrReplaceSync` response
override (`PrivateEndpointConnection.tsp`). Each explicitly suppresses its
respective official response-code diagnostic. These conversion shapes cannot
establish a missing native check on clean maintained-ruleset authoring.

### Unmarked converted POSTs are not supported provider customizations

Recovery Services Backup's `Jobs.export` and
`ProtectionContainersOperationGroup.refresh` in `routes.tsp` are handwritten
POSTs, not `ArmProviderActionSync`/`ArmProviderActionAsync` or ARM collection
actions. Both interfaces suppress `arm-resource-interface-requires-decorator`;
both operations suppress `lro-location-header` and return
`ArmAcceptedResponse<ExtraHeaders = {}>`. Neither has the collection-action
metadata required by the native POST predicate. These two already-rejected
conversion shapes are intentionally outside the contract, rather than evidence
that a supported provider customization is missed. The public provider fixtures
prove the supported case independently.

### Emitted overrides are not native compliance

The ConsistentPatchProperties `async-get-fallback` fixture sets the emitted LRO
extension to true on a PATCH with plain Location headers, suppressing
`no-openapi`. Swagger therefore has no LroExtension violation, while the native
rule reports the absent polling semantics. This is an already-rejected
OpenAPI-specific shape, not a reason to restore `getExtensions`.

SDK legacy marks and explicit emitted overrides can also cause AutoRest to emit
true independently of Core polling metadata. Their emitter branches are
research evidence only; this ARM rule intentionally has no TCGC dependency.
Native authoring should retain semantic polling headers. This is a contract
difference, not a claim of exhaustive SDK-marker corpus coverage.

## Corpus scope and historical reports

The retained production Swagger dataset selects each project's latest API
version at specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`.
It contains 468 ARM projects and 625 emitted Swagger documents, with readme
suppressions not applied. LroExtension has 39 distinct operation-path identities
in 14 projects. Raw TypeSpec diagnostics can include declarations from older API
versions; any one-sided projects require selected-version attribution before a
behavioral conclusion.

The historical `docs/coverage_old.md` aggregate reports 450 compiled projects
and 14/14 firing projects. The later pre-change full TypeSpec report uses
468 projects, 462 successful compilations, and 39/39 diagnostics in 14/14
projects. These are different report populations; the earlier equality included
the broader, extension-based implementation and does not establish native
equivalence.

## Fresh full-corpus results

The post-review full resource-manager rerun completed on October 8, 2026,
exit 0, using the pinned specs commit above. Its result index was generated at
`2026-10-08T09:34:46Z`, schema 7, `partial: false`. The runner processed all
468 projects, with 462 successes and six failures; analysis took 1,134,169 ms.
A literal Advisor filter first selected exactly one project and passed.

The earlier full run completed at 15:14:39 +08:00, before the supported
nested-service deduplication fix. The required post-review full run preserved
the same project populations, six compiler failures, and all 14 native target
identities. Corpus stability does not establish nested-service coverage; the
supported maintained-ruleset reproducer and new native regression prove the
duplicate-warning correction.

The retained Swagger population has 39 distinct project/file/method/path
identities. The raw native population has 14 distinct authored
project/source-file/line/column targets. All 14 target identities occurred in
the previous native population; 25 previous targets were deliberately removed.
The observed five shared projects contain all 14 current targets.

The table gives the complete Swagger-firing population. Paths are relative to
`specification/`. Rows with native count zero are the complete nine
validator-only projects; there are **no TypeSpec-only or unassessed
LroExtension projects**.

| Project                                                                                     | Swagger | Native | Excluded operation occurrences |
| ------------------------------------------------------------------------------------------- | ------: | -----: | ------------------------------ |
| `advisor/resource-manager/Microsoft.Advisor/Advisor`                                        |       1 |      1 | None                           |
| `apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement`                      |       1 |      0 | POST 1                         |
| `applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/Components`    |       1 |      0 | POST 1                         |
| `attestation/resource-manager/Microsoft.Attestation/Attestation`                            |       1 |      0 | DELETE 1                       |
| `domainregistration/resource-manager/Microsoft.DomainRegistration/DomainRegistration`       |       2 |      1 | POST 1                         |
| `eventhub/resource-manager/Microsoft.EventHub/Eventhub`                                     |       3 |      2 | PUT 1                          |
| `newrelic/NewRelicObservability.Management`                                                 |       1 |      0 | POST 1                         |
| `operationalinsights/resource-manager/Microsoft.OperationalInsights/OperationalInsights`    |       1 |      0 | POST 1                         |
| `recoveryservicesbackup/resource-manager/Microsoft.RecoveryServices/RecoveryServicesBackup` |      10 |      0 | POST 7, PUT 1, DELETE 2        |
| `relay/resource-manager/Microsoft.Relay/Relay`                                              |       1 |      0 | PUT 1                          |
| `security/resource-manager/Microsoft.Security/Security/SecuritySolutionsAPI`                |       2 |      0 | POST 1, PUT 1                  |
| `servicebus/resource-manager/Microsoft.ServiceBus/ServiceBus`                               |       2 |      1 | PUT 1                          |
| `sql/resource-manager/Microsoft.Sql/SQL`                                                    |       1 |      0 | PUT 1                          |
| `web/resource-manager/Microsoft.Web/AppService`                                             |      12 |      9 | POST 1, DELETE 2               |
| **Total**                                                                                   |  **39** | **14** | **POST 14, PUT 6, DELETE 5**   |

Nineteen excluded occurrences are in validator-only projects; six are within
shared projects. Twenty-one of the 25 removed targets explicitly suppress their
corresponding official POST/PUT/DELETE response-code diagnostic. Two additional
resource-action cases use `ArmResourceActionSync` (Application Insights purge)
and legacy `ActionSync` (Security JIT initiate), rather than provider/collection
templates. Their `202` responses lack native LRO metadata and belong to
resource-action/legacy prerequisites, not the new provider predicate. The
remaining two are the unmarked Recovery Services Backup POSTs described above.
This source-backed accounting explains the count reduction without classifying
conversion suppressions as clean supported authoring.

### Selected versions and raw native attribution

The 14 raw native targets consist of 13 PATCH operations and Advisor's one
provider POST. The retained latest-version Swagger population contains the same
project/verb counts for these shapes:

| Shared project     | Selected API version |  Native targets |
| ------------------ | -------------------- | --------------: |
| Advisor            | `2026-03-01-preview` | 1 provider POST |
| DomainRegistration | `2024-11-01`         |         1 PATCH |
| Eventhub           | `2026-07-01-preview` |         2 PATCH |
| ServiceBus         | `2026-07-01-preview` |         1 PATCH |
| AppService         | `2026-07-15`         |         9 PATCH |

Source inspection retained all 14 authored targets and their selected versions.
Their source files have no `@removed` or `@returnTypeChangedFrom`; the `@added`
annotations found in AppService are model properties introduced no later than
the selected `2026-07-15` version. No older-only target was identified or
excluded (zero), and there is no TypeSpec-only project requiring a separate
projected attribution. Raw native count remains 14; the observed selected-latest
comparison includes those 14 targets. This does not establish historical
all-version equivalence. The runtime rule neither constructs version snapshots
nor recreates emitted SDK/OpenAPI override behavior.

Some retained corpus declarations suppress Location/body or conversion
diagnostics. Corpus overlap therefore proves observed regression behavior, not
that every corpus operation is valid clean ARM authoring. The seven maintained
ruleset cases and focused native tests establish the supported semantic gap.

### Compiler failures and assessed population

These six projects also failed in the pre-change full report. Paths are relative
to `specification/`; counts are compiler error occurrences.

| Project                                                                                    | Error                              | Count |
| ------------------------------------------------------------------------------------------ | ---------------------------------- | ----: |
| `deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices` | `@typespec/http/duplicate-body`    |     8 |
| `monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`                  | `@typespec/http/missing-uri-param` |     8 |
| `network/resource-manager/Microsoft.Network/Network/Network`                               | `@typespec/http/missing-uri-param` |     2 |
| `quota/resource-manager/Microsoft.Quota/Quota`                                             | `@typespec/http/missing-uri-param` |     4 |
| `resources/resource-manager/Microsoft.Resources/deployments`                               | `@typespec/http/duplicate-body`    |     2 |
| `servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`                     | `@typespec/http/duplicate-body`    |     8 |

None is a Swagger LroExtension-firing project; all 14 firing projects were
assessable. The full command's successful exit does not mean all 468 projects
compiled, and this migration makes no behavioral conclusion about the six
failed projects.

## Validation commands

```powershell
mise exec -- pnpm --dir packages\typespec-lintdiff build
mise exec -- pnpm --dir packages\typespec-lintdiff exec vitest run test\rules\lro-extension.test.ts
mise exec -- pnpm --dir packages\typespec-lintdiff validate LroExtension --parallelism=6
mise exec -- pnpm --dir packages\typespec-lintdiff validate ConsistentResponseSchemaForPut --parallelism=6
mise exec -- pnpm --dir packages\typespec-lintdiff validate ConsistentPatchProperties --parallelism=6
mise exec -- pnpm --dir packages\typespec-lintdiff validate XmsPageableMustHaveCorrespondingResponse --parallelism=6
mise exec -- pnpm --dir packages\typespec-lintdiff specs:typespec --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-lro-extension --filter specification/advisor/resource-manager/Microsoft.Advisor/Advisor --concurrency 6
mise exec -- pnpm --dir packages\typespec-lintdiff specs:typespec --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-lro-extension --concurrency 6
```

The full corpus is validation evidence, not a generated-output change for this
PR. Its immutable Swagger input, fresh native shard, complete population and
source-target accounting, raw logs, and manifest-based cleanup archive are
retained in the task handoff. Explicit changed-surface format/lint and an
independent complete-diff review gate publication.
