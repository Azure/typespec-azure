# DescriptionMustNotBeNodeName migration

## Result and gap summary

The full ARM corpus has **70,815 Swagger findings / 105 successfully compiled
projects**, versus **7,523 TypeSpec findings / 143 projects**, with all 105
validator projects overlapping. Verified selected-version attribution retains
**7,501 findings / 142 projects**; 22 are removed/later-version declarations.
The 37 TypeSpec-only projects involve unused/shared or client-only types,
unemitted version members, qualified schema names, template-renamed keys, or
constant parameters erased during emission. Swagger repeats documentation across
referenced files and inline schemas. Cycle1 fixes inferred HTTP verbs and JSON
encoded property names, preserving earlier member/key coverage; 41 native tests
and 13 fixtures pass. Regenerated corpus diagnostics are unchanged: its shapes
did not expose these two misses. **Exact executable Swagger equivalence remains
partial**: emission-only names and generated/reference nodes remain outside the
native contract. Project overlap does not establish one-to-one parity;
excluded invalid programs and universal source/output correspondence remain
unassessed.

## Decision and native scope

**TypeSpec rule update required, completed.** The former implementation omitted
enum member and union variant documentation, although these are supported
native targets that supply `x-ms-enum.values[*].description`. It also exempted
all keys, including documented ordinary payload keys. The production change
checks those targets without an emitter, OpenAPI, SDK, or ARM dependency.
Missing documentation remains the responsibility of `documentation-required`.

Cycle1 repairs two further supported native omissions confirmed during promotion
review: inferred HTTP operation verbs and JSON encoded property names.
`getHttpOperation` supplies effective GET/POST verbs, including operations without
an explicit verb decorator. Compiler `resolveEncodedName` supplies ordinary JSON
property names without inspecting emitter output. Path/query/header names still
take precedence, status-code properties remain exempt, and a JSON-renamed property's
source-name-only documentation no longer triggers name equality. Placeholder
normalization, exact authored targets, and explicit HTTP verbs remain covered.
The earlier explicit-verb-only/source-property-name-only contract was incomplete,
not an intentional native limitation.

The native guideline is documentation quality on authored semantic
declarations, not documentation quality only on reachable emitted schemas.
Unused project types and client compatibility declarations are consequently
checked, as with the compiler-wide traversal used by official documentation
rules. Standard ARM templates allow custom `@doc` and doc comments and do not
prevent these violations. The official Azure Core `documentation-required`
checks missing text, not repeated names or the placeholder `description`;
neither official linter registration supplies equivalent quality enforcement.
The maintained ARM RPC coverage inventory does not map R3011 to an enabled
equivalent rule or template prohibition.

See [rule.md](./rule.md) for the native target/exemption contract and supported
shape matrix. The directly related changes are the production rule, 41 native
predicate tests, `member-and-key-documentation`, and three cycle1 fixtures.
No validator, emitter, report generator, dataset, or normalization change is
required or included.

## Revisions and comparable populations

- Specs: [Azure/azure-rest-api-specs at
  `f6b53f105b95da05276530a0754a1c71b4f16397`](https://github.com/Azure/azure-rest-api-specs/tree/f6b53f105b95da05276530a0754a1c71b4f16397).
- Development base: `5843b339a3f1c7580ec809277b1e2e238cc98096`,
  `feature/lintdiff-migration-new`.
- Full run: 468 projects attempted, 462 successful, six compiler failures.
  Cycle1 analysis generated `2026-10-10T06:40:53.872Z`, duration 1,157,903 ms.
  The corpus command exited successfully; failed project compilations are
  retained and excluded from both sides of behavioral comparisons.
- Retained production validator dataset generated `2026-08-06T08:03:27.940Z`;
  all 86,264 rule findings reference the recorded selected-version Swagger
  files, not older output files. A project can have many selected files: SQL
  has 142 and Network has 17.
- Validator execution is ARM AutoRest Azure validation with reference
  resolution; readme suppressions were not applied. Staging rules are not used
  for this rule.
- TypeSpec execution uses the linked updated local linter and the checked-in
  `tsp-lintdiff-local-linter/all` ruleset, source compilation with `--no-emit`,
  `--warn-as-error=false`, six workers, and existing source suppressions.
  This rule has no built-in projected HTTP-reachability filter.
- The cycle1 full run rebuilt and directly linked this worktree's changed
  linter. Its complete local-linter input fingerprint is
  `sha256:b7fed84319d56629ed325f355b3c37ffa05886ba0782a3a63049b70b6e665541`;
  the repaired rule source SHA256 is
  `d4ce56b9f9f44333f95bc83d377c6436bf117c6f70e5899d0b29a5cdb0bdc84f`.
  The run precedes the repair commit, so its recorded Git HEAD
  `8da6857aafe62d9c0f7d4f55ef90978b34dac97d` alone does not identify the changed
  source. These content fingerprints bind the validation to the repaired code.
- Additional selected-version research used the compiler's version snapshot
  mutator, following the existing projected-worker approach. It reran the
  same native predicate on the selected semantic graph, then retained only
  observed raw diagnostics with matching project/file/line/column identities.
  Unsuppressed extra findings from directly invoking the listener were not
  added. All 143 successful rule-affected projects were attributed; source
  and dependencies were unchanged. Shared source locations cannot distinguish
  every transformed semantic instance, so this is conservative attribution,
  not an emitter-equivalence adapter or a stronger canonical identity.
- That selected-version investigation was performed in cycle0, not rerun in
  cycle1. Reuse is justified by an exact comparison against the archived cycle0
  shard: all 8,499 diagnostic records (including message, project, source file,
  line, and column) and their multiplicities are unchanged, with zero additions
  or removals, the identical six failed-project identities, identical specs pin,
  and identical 38 raw native-only projects. Intersecting the freshly regenerated
  diagnostics with the verified prior selected source identities again retains
  7,501 findings in 142 projects. The one-sided source/emission witnesses and
  version exclusions therefore remain applicable; this is not a new projection
  run or proof that the old source already covered the repaired shapes.

### Report reconciliation

The external snapshot is
[`docs/coverage_old.md`](../../../docs/coverage_old.md), recorded at commit
`6a418911dbe5d35992fb5845cf4460d45643fec8`. Its source gist identifies 450
compiled projects and 210 rules but does not pin the individual project
population, generator revision, or specs revision. This rule appears in
“Validator never fired, but has some form of coverage”; only its local lint
mapping is credited, not observed same-project diagnostics. Missing per-project
details cannot be reconstructed from its aggregate disposition.

The observed report is
[`specs/coverage-breakdown.md`](../../../specs/coverage-breakdown.md), generated
by `test/harness/typespec-results.ts` (last source change
`e926485e3cf8e4caf9e39b8a02aecee99a91d361`). The checked-in old report's last
change is `bf4e84189edc4ebcfcd2fc6ef881e74e3f485ece`. Generated corpus reports
are archived validation evidence and intentionally excluded from this PR;
the checked-in report therefore continues to show the earlier implementation.

| Report/population                                            |        Validator projects | TypeSpec projects |      Overlap |      Validator-only |       TypeSpec-only | Validator findings | TypeSpec findings |
| ------------------------------------------------------------ | ------------------------: | ----------------: | -----------: | ------------------: | ------------------: | -----------------: | ----------------: |
| External aggregate disposition                               | Not reported for this row |      Not reported | Not reported | Not reconstructable | Not reconstructable |       Not reported |      Not reported |
| Earlier checked-in observed report, 462 successful projects  |                       105 |                 5 |            2 |                 103 |                   3 |             70,815 |                19 |
| Cycle1 full source-program run, same 462 successful projects |                       105 |               143 |          105 |                   0 |                  38 |             70,815 |             7,523 |
| Cycle1 reuse of verified selected-version attribution        |                       105 |               142 |          105 |                   0 |                  37 |             70,815 |             7,501 |

The external/observed discrepancy is a different population and definition:
mapping credit for a never-fired disposition versus successful-project
diagnostic overlap. It is not evidence that this rule never fires today.
The old/new observed improvement comes from the member checks, not a change to
the specs revision or successful-project denominator.

### Compiler exclusions

The six projects below account for 15,449 retained Swagger and 976 raw native
findings excluded from the successful population. Failures are HTTP compiler
diagnostics, not this warning rule; no source changes or corpus retries were
made to fix unrelated spec conversions.

| Excluded project (prefix `specification/`)                                                 | Compiler error                                                   |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices` | `@typespec/http/duplicate-body`, client compatibility operations |
| `monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`                  | `@typespec/http/missing-uri-param`, legacy operation templates   |
| `network/resource-manager/Microsoft.Network/Network/Network`                               | `@typespec/http/missing-uri-param`, legacy operation templates   |
| `quota/resource-manager/Microsoft.Quota/Quota`                                             | `@typespec/http/missing-uri-param`, legacy operation templates   |
| `resources/resource-manager/Microsoft.Resources/deployments`                               | `@typespec/http/duplicate-body`, legacy operation templates      |
| `servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`                     | `@typespec/http/duplicate-body`, client compatibility operations |

In particular, Quota's selected Swagger **does** contain the two repeated
`Properties` findings. Its absence from the successful-project comparison is
explained by compilation exclusion, not a proven validator pipeline defect.

## Cardinality and conservative identities

| Population/identity                                       |               Swagger |             TypeSpec |
| --------------------------------------------------------- | --------------------: | -------------------: |
| Entire retained/raw population, including failed projects | 86,264 / 109 projects | 8,499 / 147 projects |
| Successful-project raw findings                           |                70,815 |                7,523 |
| Successful project + Swagger file + JSON path             |                70,815 |       Not comparable |
| Successful project + JSON path, ignoring file             |                 6,941 |       Not comparable |
| Successful project + source file + line + column          |        Not comparable |                7,519 |
| Selected-version retained findings                        |                70,815 |                7,501 |
| Selected-version project + source file + line + column    |        Not comparable |                7,497 |

Across all retained Swagger findings, file/path deduplication gives 86,177 and
file-independent paths give 7,887. Of 86,264 raw findings, **86,255 select
`x-ms-enum` metadata**; the nine other findings are seven Cloudngfw properties
and two Quota properties. This dominance explains why omitting members removed
nearly all observed coverage.

Using successful-project Swagger paths versus native source locations, the
unprojected per-project counts are equal in 18 projects, Swagger-higher in 21,
and TypeSpec-higher in 104. Positive differences sum to 550; negative
differences sum to 1,128. After selected-version mutation, these counts are
18 / 21 / 103, with positive differences 558 and negative differences 1,114.
These are different identity domains, not a precision/recall calculation.
No collision-prone matching by member name alone is used to claim parity.

### Largest count outliers

| Project                                                            | Swagger raw | Swagger file-independent paths | Native source locations, unprojected | Explanation                                                                                                                                                                                        |
| ------------------------------------------------------------------ | ----------: | -----------------------------: | -----------------------------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sql/.../Microsoft.Sql/SQL`                                        |      64,724 |                            850 |                                  610 | Reference-resolved common enum declarations recur across 142 selected files; inline parameter enum metadata adds distinct paths. Eight native findings are absent after selected-version mutation. |
| `alertsmanagement/.../Microsoft.AlertsManagement/AlertsManagement` |         200 |                            200 |                                   76 | 76 definition paths plus 124 inline operation-parameter paths reuse enum documentation already checked at its native member.                                                                       |
| `app/.../Microsoft.App/ContainerApps`                              |         192 |                            192 |                                  269 | Native traversal includes documented source/client declarations beyond selected emitted definitions; six findings disappear under version mutation.                                                |

SQL's `ColumnDataType` alone contributes 3,740 findings across 110 selected
root files but only 34 file-independent member paths. Native `models.tsp`
contains the 34 authored union members. The selected `databaseColumns.json`
references `common.json`; it does not itself define `ColumnDataType`.
This is resolved-reference multiplicity, not 3,740 distinct authored errors.
The remaining source/path outlier totals are not promoted to a one-to-one
canonical correspondence: member targets, inline copies, external naming, and
unemitted declarations have different identities.

## Complete one-sided project investigation

**Validator-only list: empty**, both before and after selected-version
attribution. Same-project overlap is 105. The table is the complete original
38-project TypeSpec-only list; Advisor disappears after projection, leaving 37. All project paths below are relative to the pinned specs repo, prefixed by
`specification/`.

Causes:

- **U:** documented unused/imported shared declarations, or source types not
  emitted by this service. Source reference sites and every selected Swagger
  description field were inspected; matching member documentation is absent
  from the selected output, not a missed validator finding.
- **C:** client compatibility enum/union used by `@@alternateType` or other
  language-specific customization, with no matching emitted member descriptions.
- **V:** removed/later-version declarations, or version-enum members retained
  in the compiler graph but not emitted for the selected API version.
- **N:** native and namespace-qualified emitted schema names differ.
- **K:** authored resource key versus template-generated path parameter name.
- **P:** constant path parameter becomes a literal route segment.

| Project                                                                                            | Selected API version | Raw → selected native findings | Cause and inspected target                                                                           |
| -------------------------------------------------------------------------------------------------- | -------------------- | -----------------------------: | ---------------------------------------------------------------------------------------------------- |
| `advisor/resource-manager/Microsoft.Advisor/Advisor`                                               | `2026-03-01-preview` |                          6 → 0 | V: removed `PriorityName`, `RecommendationStatusName` in `models.tsp`                                |
| `alertsmanagement/resource-manager/Microsoft.AlertsManagement/AlertRuleRecommendations`            | `2023-08-01-preview` |                        40 → 40 | U: `CreatedByType`, `MetricAlertsDisplayUnit`, no source references beyond their declarations        |
| `alertsmanagement/resource-manager/Microsoft.AlertsManagement/PrometheusRuleGroups`                | `2023-03-01`         |                          4 → 4 | U: unused `CreatedByType`                                                                            |
| `apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement`                             | `2025-09-01-preview` |                          1 → 1 | C: `client.tsp` `AssociationEntityProvisioningState.Created`                                         |
| `applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/LiveTokenApi`         | `2021-10-14`         |                          5 → 5 | U: imported `../common/main.tsp` `CategoryType`, `WorkbookSharedTypeKind`                            |
| `applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WorkbookTemplatesApi` | `2020-11-20`         |                          4 → 4 | U: unused `CreatedByType`                                                                            |
| `authorization/resource-manager/Microsoft.Authorization/Authorization/AttributeNamespaces`         | `2025-12-01-preview` |                          5 → 5 | U: imported `../Common/main.tsp` `PrincipalType`                                                     |
| `containerservice/resource-manager/Microsoft.ContainerService/fleet`                               | `2026-06-01`         |                          3 → 3 | N: `ClusterSelector`, `ClusterSelectorTerm`, `TaintEffect`                                           |
| `desktopvirtualization/resource-manager/Microsoft.DesktopVirtualization/DesktopVirtualization`     | `2026-04-01-preview` |                          7 → 7 | C: `ScalingScheduleDaysOfWeekItemUsingStruct`, used by client customization                          |
| `developerhub/resource-manager/Microsoft.DevHub/DeveloperHub`                                      | `2025-03-01-preview` |                          8 → 8 | U: local `CreatedByType`, `Origin`, `ActionType`; service uses ARM common operation types instead    |
| `eventhub/resource-manager/Microsoft.EventHub/Eventhub`                                            | `2026-07-01-preview` |                          9 → 9 | C: `client.tsp` `EventHubEntityStatus`                                                               |
| `iotoperations/resource-manager/Microsoft.IoTOperations/IoTOperations`                             | `2026-07-01`         |                          2 → 2 | V: `Versions` members `2025-07-01-preview` and `2025-10-01`, not the selected emitted version member |
| `keyvault/resource-manager/Microsoft.KeyVault/KeyVault`                                            | `2026-03-01-preview` |                          6 → 6 | C: `KeyVaultCreateMode`, `KeyVaultPatchMode`, `ManagedHsmCreateMode`                                 |
| `manufacturingplatform/Manufacturingplatform.Management`                                           | `2025-03-01`         |                          1 → 1 | K: `main.tsp` `MdsResource.name`                                                                     |
| `migrate/resource-manager/Microsoft.Migrate/Waves`                                                 | `2026-02-01-preview` |                          2 → 2 | U: shared `Common/ArmModels/MigrateProject.tsp` `Items` members                                      |
| `migrate/resource-manager/Microsoft.OffAzure/OffAzure`                                             | `2024-12-01-preview` |                          7 → 7 | U: unused local `Origin`, `ActionType`, `CreatedByType`                                              |
| `monitor/resource-manager/Microsoft.Insights/Insights/ActivityLogAlertsApi`                        | `2023-01-01-preview` |                        10 → 10 | U: imported `../Common/main.tsp` identity/receiver/criterion/result types                            |
| `monitor/resource-manager/Microsoft.Insights/Insights/AlertRulesIncidentsApi`                      | `2016-03-01`         |                        10 → 10 | U: same shared declarations, not emitted by this API                                                 |
| `monitor/resource-manager/Microsoft.Insights/Insights/LogProfilesApi`                              | `2016-03-01`         |                        10 → 10 | U: same shared declarations, not emitted by this API                                                 |
| `monitor/resource-manager/Microsoft.Insights/Insights/NetworkSecurityPerimeterApi`                 | `2021-10-01`         |                          6 → 6 | U: unused `Severity`, `CreatedByType`                                                                |
| `monitor/resource-manager/Microsoft.Insights/Insights/ServiceDiagnosticsSettingsApi`               | `2016-09-01`         |                        10 → 10 | U: same shared declarations, not emitted by this API                                                 |
| `recoveryservicesbackup/resource-manager/Microsoft.RecoveryServices/RecoveryServicesBackup`        | `2026-05-31-preview` |                          6 → 6 | P: `backupStorageConfigName`, `backupJobs`; three distinct source locations, six semantic findings   |
| `recoveryservicesdatareplication/resource-manager/Microsoft.DataReplication/DataReplication`       | `2026-05-01`         |                          2 → 2 | U: unused `HostType` union                                                                           |
| `resources/resource-manager/Microsoft.Authorization/policy`                                        | `2026-07-01`         |                          4 → 4 | U: unused `CreatedByType`                                                                            |
| `security/resource-manager/Microsoft.Security/Security/ATPSettingsAPI`                             | `2019-01-01`         |                        20 → 20 | U: imported Common types not emitted by this API                                                     |
| `security/resource-manager/Microsoft.Security/Security/ApplicationsAPI`                            | `2022-07-01-preview` |                        20 → 20 | U: same Common types                                                                                 |
| `security/resource-manager/Microsoft.Security/Security/ComplianceResultsAPI`                       | `2017-08-01`         |                        20 → 20 | U: same Common types                                                                                 |
| `security/resource-manager/Microsoft.Security/Security/DataScannersAPI`                            | `2026-08-01`         |                        20 → 20 | U: same Common types                                                                                 |
| `security/resource-manager/Microsoft.Security/Security/GovernanceAPI`                              | `2022-01-01-preview` |                        20 → 20 | U: same Common types                                                                                 |
| `security/resource-manager/Microsoft.Security/Security/LocationsAPI`                               | `2015-06-01-preview` |                        20 → 20 | U: same Common types                                                                                 |
| `security/resource-manager/Microsoft.Security/Security/MdeOnboardingAPI`                           | `2021-10-01-preview` |                        20 → 20 | U: same Common types                                                                                 |
| `security/resource-manager/Microsoft.Security/Security/OperationsAPI`                              | `2025-10-01-preview` |                        23 → 23 | U: same Common types plus unused local `Origin`                                                      |
| `security/resource-manager/Microsoft.Security/Security/PricingsAPI`                                | `2024-01-01`         |                        20 → 20 | U: same Common types                                                                                 |
| `security/resource-manager/Microsoft.Security/Security/RegulatoryComplianceAPI`                    | `2019-01-01-preview` |                        20 → 20 | U: same Common types                                                                                 |
| `security/resource-manager/Microsoft.Security/Security/SecureScoreAPI`                             | `2020-01-01`         |                        20 → 20 | U: same Common types                                                                                 |
| `security/resource-manager/Microsoft.Security/Security/SecurityOperatorsAPI`                       | `2023-01-01-preview` |                        20 → 20 | U: same Common types                                                                                 |
| `storage/Storage.Management`                                                                       | `2026-04-01`         |                          2 → 2 | C: `CSharpManagementPolicyName`, `CSharpBlobInventoryPolicyName`                                     |
| `web/resource-manager/Microsoft.Web/AppService`                                                    | `2026-07-15`         |                          2 → 2 | C: client `ClientCredentialMethod`, `ConfigReferenceSource`                                          |

The security Common group contains `Source`, `ActionType`, `SettingName`,
`ProvisioningState`, `CreatedByType`, and `Severity`. The monitor Common group
contains `IdentityType`, `ReceiverStatus`, `CriterionType`, and `ResultType`.
Checking every selected Swagger description field for each one-sided project
found no matching member text, except Fleet's three qualified schemas and
Manufacturing's five renamed path parameter occurrences. This verifies the
output absence rather than assuming that an absent schema-name match alone
establishes reachability.

### Version attribution details

The 22 source findings removed by the selected-version mutator are:

| Project       | Source targets                                                                           | Count |
| ------------- | ---------------------------------------------------------------------------------------- | ----: |
| Advisor       | `PriorityName.{High,Medium,Low}`, `RecommendationStatusName.{Approved,Rejected,Pending}` |     6 |
| IoTHub        | `GEN2`, `Generation2` members in `models.tsp`                                            |     2 |
| ContainerApps | `Labels`, `Smb`, `Shell`, `NodeLTS`, `SpringCloudGateway`, `Nacos` members               |     6 |
| SQL           | `Enabled`, `Disabled`, `Default`, `CCN`, `Email`, `Number`, `SSN`, `Text` members        |     8 |

IoTOperations additionally has two older version-enum member descriptions
retained in the compiler graph. The emitter's `getSchemaForVersionEnum`
selects only the member matching `context.version`; source projection alone
does not remove other members of the version enumeration. Excluding these two
from a **selected emitted-version** behavioral population gives 7,499
findings / 141 projects, with 36 TypeSpec-only projects and unchanged
105-project overlap. The raw source-program warnings remain valid under the
native documentation-quality contract; production code is not changed to
suppress them.

## Code-backed examples

All source excerpts below were read from the pinned specs checkout, except
the explicitly identified new comparison fixture.

### Gap example: omitted authored members and repeated references

- **Classification/status:** formerly validator-only; native omission fixed,
  residual count-only resolved-reference multiplicity.
- **Project/version:** `sql/resource-manager/Microsoft.Sql/SQL` /
  `2025-02-01-preview`.
- **Source:** `models.tsp`, `ColumnDataType.image`.

```typespec
union ColumnDataType {
  string,

  /** image */
  image: "image",
  // Other members omitted.
}
```

Selected `swagger/preview/2025-02-01-preview/common.json`:

```json
{ "name": "image", "value": "image", "description": "image" }
```

`databaseColumns.json` uses
`"./common.json#/definitions/DatabaseColumnListResult"`. The validator's
resolved graph reports `definitions.ColumnDataType.x-ms-enum.values[0]`
under many root-file identities. TypeSpec now reports the authored `image`
variant directly; the previous rule had no variant listener.

| Engine   | Observed result                                                                            |
| -------- | ------------------------------------------------------------------------------------------ |
| Swagger  | Matching enum metadata diagnosed; 3,740 `ColumnDataType` occurrences across 110 root files |
| TypeSpec | Each offending authored member diagnosed, without loading referenced Swagger               |

**Disposition:** retain the native member fix; do not multiply source
diagnostics to simulate root-file reference resolution.

### Gap example: inline parameter enum copies

- **Classification/status:** count-only, explained emission multiplicity.
- **Project/version:** `alertsmanagement/.../AlertsManagement` /
  `2025-05-25-preview`.
- **Source:** `models.tsp`, `MonitorService`.

```typespec
union MonitorService {
  string,

  /** Application Insights */
  `Application Insights`: "Application Insights",
  // Other members omitted.
}
```

Selected `AlertsManagement.json` contains both definition and inline
parameter metadata:

```json
{
  "name": "Application Insights",
  "value": "Application Insights",
  "description": "Application Insights"
}
```

The inline witness is
`paths["/{scope}/providers/Microsoft.AlertsManagement/alerts"].get.parameters[5].x-ms-enum.values[0]`.
Swagger has 76 definition findings plus 124 inline parameter findings;
TypeSpec has 76 source targets.
**Disposition:** matching predicate, different diagnostic unit; no extra
native reports per emitted inline occurrence.

### Gap example: unused shared source declarations

- **Classification/status:** TypeSpec-only, intentional native source scope.
- **Project/version:** `alertsmanagement/.../AlertRuleRecommendations` /
  `2023-08-01-preview`.
- **Source:** `models.tsp`, `CreatedByType.User`.

```typespec
union CreatedByType {
  string,

  /** User */
  User: "User",
  // Other members omitted.
}
```

The only source occurrence of `CreatedByType` in this project is its
declaration. No selected Swagger description field contains `User`,
`Application`, `ManagedIdentity`, or `Key` as the repeated member text.
Similarly, other listed imported Common groups are present in the semantic
program but their matching descriptions do not appear in that service's
selected output.

| Engine   | Observed result                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------- |
| Swagger  | No corresponding emitted documentation node                                                       |
| TypeSpec | Four matching `CreatedByType` members diagnosed, plus 36 unused `MetricAlertsDisplayUnit` members |

**Disposition:** intentional extra documentation coverage, not a validator
false positive or a missing native reachability guard.

### Gap example: client compatibility types

- **Classification/status:** TypeSpec-only, intentional source scope.
- **Project/version:** `apimanagement/.../ApiManagement` /
  `2025-09-01-preview`.
- **Source:** `client.tsp`, `AssociationEntityProvisioningState.Created`.

```typespec
union AssociationEntityProvisioningState {
  string,

  /** Created. */
  Created: "created",
}
```

The pinned source explicitly describes this as a C# compatibility enum applied
with `@@alternateType` so OpenAPI remains unchanged. No selected OpenAPI
description field contains the repeated `Created.` text.
Swagger therefore has no corresponding documentation check, while TypeSpec
reports the explicit authored variant. EventHub, KeyVault, Storage, Web, and
DesktopVirtualization have the client-type witnesses identified in the table.
**Disposition:** keep general authored documentation checks; do not depend on
TCGC or predict client-language emission.

### Gap example: removed declarations

- **Classification/status:** TypeSpec-only, selected-version population mismatch.
- **Project/version:** `advisor/.../Advisor` / `2026-03-01-preview`.
- **Source:** `models.tsp`, `PriorityName`.

```typespec
@removed(Versions.v2026_03_01_preview)
union PriorityName {
  string,

  /** High */
  High: "High",
  // Other members omitted.
}
```

The selected API version equals the removal version. Swagger has no
`PriorityName` schema; the raw source-program lint includes three members
here and three in similarly removed `RecommendationStatusName`.
Selected-version mutation retains none of the six source identities.
**Disposition:** exclude from selected-version comparison, preserve raw
source warnings; no production suppression.

### Gap example: qualified schema names

- **Classification/status:** TypeSpec-only, intentional native/emitted naming
  difference.
- **Project/version:** `containerservice/.../fleet` / `2026-06-01`.
- **Source:** `kubefleet/apis/placement/v1/types.tsp`, `ClusterSelector`.

```typespec
@doc("ClusterSelector")
model ClusterSelector {
  // Properties omitted.
}
```

Selected `fleets.json`:

```json
{
  "Placement.V1.ClusterSelector": {
    "type": "object",
    "description": "ClusterSelector"
  }
}
```

| Engine   | Observed result                                         |
| -------- | ------------------------------------------------------- |
| Swagger  | No match: qualified schema key differs from description |
| TypeSpec | Match: explicit text repeats native model name          |

The same cause accounts for `Placement.V1.ClusterSelectorTerm` and
`Core.V1.TaintEffect`.
**Disposition:** intentional native coverage; do not reproduce emitter name
qualification.

### Gap example: resource key transformed by templates

- **Classification/status:** TypeSpec-only, intentional authored/instantiated
  target distinction.
- **Project/version:** `manufacturingplatform/Manufacturingplatform.Management`
  / `2025-03-01`.
- **Source:** `main.tsp`, `MdsResource.name`.

Property excerpt (inside `MdsResource`):

```text
@key("mdsResourceName")
@segment("manufacturingDataServices")
@doc("Name.")
@path
@visibility(Lifecycle.Read)
name: string;
```

Selected operation parameter:

```json
{ "name": "mdsResourceName", "in": "path", "description": "Name." }
```

The generated parameter occurs in five operations and does not repeat its
wire name. The authored property has default HTTP path metadata `name` and
uninformative documentation; TypeSpec reports that declaration. It does not
infer the template-generated operation parameter name from the `@key` string.
**Disposition:** intentional native source coverage; explicit path/query/header
wire-name overrides themselves remain supported and tested.

### Gap example: constant path parameter and semantic instances

- **Classification/status:** TypeSpec-only/count-only, intentional emission
  removal and diagnostic-unit difference.
- **Project/version:** `recoveryservicesbackup/.../RecoveryServicesBackup` /
  `2026-05-31-preview`.
- **Source:** `BackupResourceConfigResource.tsp` lines 114–117.

Parameter-model excerpt:

```text
/** backupStorageConfigName */
@path
@segment("backupstorageconfig")
backupStorageConfigName: "vaultstorageconfig",
```

The emitted route ends in
`/backupstorageconfig/vaultstorageconfig`; no named
`backupStorageConfigName` parameter documentation is emitted. The native rule
checks the explicit source documentation. Two operations share line 117,
two share line 158, and two `backupJobs` instances share `JobResource.tsp`
line 136: six semantic findings collapse to three source identities.
**Disposition:** preserve per-semantic-target reporting, document source-location
deduplication; do not synthesize erased OpenAPI parameters.

### Gap example: non-HTTP key quality

- **Classification/status:** supported native miss fixed.
- **Evidence:** new `member-and-key-documentation/main.tsp`.

```typespec
model Widget {
  @key
  @doc("id.")
  id: string;
  // Other properties omitted.
}
```

The fixture emits `Widget.properties.id.description = "id."`.
Swagger diagnoses that property; the updated native rule diagnoses `id`
instead of exempting every key. The same fixture has explicitly documented
enum member `Ready` and union variant `Active`; both engines emit exactly
three target-rule findings. The nine earlier fixture snapshots remain
byte-identical.

### Gap example: inferred HTTP verbs

- **Classification/status:** supported native miss fixed in cycle1.
- **Source:** `inferred-http-verbs/main.tsp`, `read` and `create`.
- **Scope:** generic supported HTTP authoring; the POST fixture uses a model body
  rather than relying on an ARM-invalid scalar payload.

```typespec
@route("/widgets")
@doc(" GET. ")
op read(): string;

@route("/widgets")
@doc("post")
op create(@body body: Widget): Widget;
```

The fixture defines `Widget` with a descriptively documented string property.
Its emitted operation descriptions are `" GET. "` on
`paths["/widgets"].get.description` and `"post"` on
`paths["/widgets"].post.description`. The validator snapshots report exactly
these two target-rule findings. Native source diagnostics now report the authored
`read` and `create` declarations using names `get` and `post`, respectively.
Previously `getOperationVerb` returned no explicit metadata and both were missed.
**Disposition:** resolve native effective HTTP semantics; no emitter simulation.

### Gap example: JSON encoded property name

- **Classification/status:** supported native miss fixed in cycle1, with compliant
  renamed source-name-only control.
- **Source:** `json-encoded-property/main.tsp`, `Widget.sourceName`.

```typespec
model Widget {
  @encodedName("application/json", "wire-name")
  @doc(" Wire-Name. ")
  sourceName: string;
}
```

The fixture's emitted `Widget.properties["wire-name"].description` is
`" Wire-Name. "`. The validator reports that JSON property key, and the repaired
native rule reports the authored `sourceName` property with resolved name
`wire-name`. In `json-encoded-source-name-only`, identical encoding with
`@doc("sourceName")` is compliant in both engines; the earlier source-name
comparison would incorrectly diagnose this control.
**Disposition:** use compiler JSON serialization metadata with source-name
fallback; preserve HTTP parameter-name precedence and status-code exemption.
An existing `PatchPropertiesCorrespondToPutProperties/encoded-name-mismatch`
placeholder finding retains its count and target but now displays
`patchDescription` instead of `description`, its correct JSON property name.

## Validation and remaining limits

- Native predicate tests: 41 passed, zero failed/skipped, checked-in Vitest
  limits, compiler/HTTP only; exact target/count assertions included.
- Strict comparison suite: 13 cases, nine covered violating cases, four
  validator-clean controls with reviewed ambient diagnostics, zero unresolved
  fixture gaps. Snapshot update followed by strict validation passed.
  The affected 14-case `PatchPropertiesCorrespondToPutProperties` suite also
  passed strict validation; only the JSON-renamed placeholder's displayed name
  changed, without target or count changes.
- Production package build, explicit maintained-file Prettier, changed-TS
  oxlint, and diff hygiene passed. Generated snapshots are not formatted.
- Representative corpus `AlertProcessingRules`: one successful project;
  subsequent full corpus processed all 468 and preserved six exclusions.
- Cycle0 selected-version extraction: 143 successful projects, reused in cycle1
  only after the complete current-versus-archived diagnostic comparison above.
  Initial Windows
  loader-path and oversized metadata-argument failures were preserved; two
  separately coordinator-authorized invocation-only corrections completed the
  original scope. The latter ran only 29 unspawned projects and retained the
  114 passing results without rerun. No package, source predicate, test,
  dependency, or timeout alteration was used to obtain those results.
- Supplemental noise audit failed before loading rule code because the default
  validator junction was absent in that shell; strict required fixture runs
  used verified sources and passed. It was not rerun or claimed green.
  Read-only witness attempts also preserved a reference-root lookup error and
  a Windows decoding error; direct source/emission inspection supplied the
  examples above. A direct-validator research invocation failed before
  predicate execution and is not presented as evidence of executable parity.

The rule is validated for its documented native contract. It is **not
functionally identical over arbitrary emitted Swagger graphs**: namespace/SDK
name overrides, erased or generated targets, external referenced declarations,
and source-versus-output multiplicity remain documented limits. No investigated
one-sided project demonstrates a further missed authorable native check.
Universal source/output diagnostic correspondence, collision-free
canonicalization, and behavior on excluded compiler-invalid programs are not
claimed. Generated corpus data and research artifacts are retained externally,
not included in the rule PR.
