# PatchInOperationName migration

## Result and gap summary

The full 468-project ARM corpus produced 14 Swagger diagnostics in 14 projects
and 23 native diagnostics in 19 successfully compiled projects. All 14 Swagger
projects overlap; none are validator-only. Nine extra native findings comprise
one historical Advisor operation absent from the selected API version, seven
authored names hidden by SDK naming overrides, and one SecurityInsights name
accepted because its emitted group starts with `Update`. Selected-version
attribution therefore yields 22 native findings in 18 projects versus 14
Swagger findings in 14 projects. The update is complete: checking concrete HTTP
endpoints removes 39 generic-template findings and one out-of-service client
customization from the previous native population. This is an intentional
authored ARM naming policy, **not exact Swagger functional equivalence**.
Six compile failures are excluded from both engines; corpus overlap does not
establish universal equivalence. No observed one-sided finding remains
unclassified, but emitted-name exemptions remain outside the native contract.

## Decision and native contract

**TypeSpec rule update required and completed.** The previous operation listener
reported generic template instances instead of only concrete service endpoints.
The rule now resolves HTTP services, checks each PATCH endpoint's authored
operation name for a case-insensitive `update` prefix, and reports on that
operation. Response codes do not change the predicate.

The temporary mixed-runner service-level ARM provider guard isolates this rule
from data-plane policy. Promotion into an ARM-only ruleset should remove that
infrastructure guard; the ruleset supplies applicability. The implementation
uses supported compiler, HTTP and ARM APIs, not AutoRest, OpenAPI operation IDs,
TCGC name resolution, reference strings or compiler mutation.

The official Azure Core `use-standard-names` rule only checks PATCH naming when
a response includes 201 and accepts `create` or `update`. It is enabled by the
data-plane ruleset, not the ARM ruleset. ARM templates and `$armResourceUpdate`
preserve authored names. RPC009's template enforcement concerns HTTP verbs,
not naming. The supported `modify is ArmResourcePatchSync<Widget, Properties =
WidgetProperties>` fixture proves the uncovered ARM customization.

Required changes are confined to `src/rules/patch-in-operation-name.ts`, its
native tests, standard ARM violation/compliance fixtures, affected diagnostic
snapshots and rule documentation. No validator, emitter or corpus-generator
change is needed.

## Report reconciliation and reproducibility

| Evidence                                                                    | Population                  | Validator projects | Native projects | Official credit | Overlap      | Validator-only | Native-only  | Diagnostics Swagger/native |
| --------------------------------------------------------------------------- | --------------------------- | ------------------ | --------------- | --------------- | ------------ | -------------- | ------------ | -------------------------- |
| [External aggregate](../../../docs/coverage_old.md), 100% coverage category | 450 compiled, 210 rules     | 14                 | 14              | 0               | Not provided | Not provided   | Not provided | Not provided               |
| Archived pre-change coverage report                                         | 462/468 compiled, 215 rules | 14                 | 24              | No              | 14           | 0              | 10           | 14/63                      |
| Refreshed production coverage report, partial Swagger mapping               | 462/468 compiled, 215 rules | 14                 | 19              | No              | 14           | 0              | 5            | 14/23                      |
| Selected-version attribution of refreshed findings                          | Same successful set         | 14                 | 18              | No              | 14           | 0              | 4            | 14/22                      |

The external aggregate credits migration dispositions and mappings, whereas
`specs/coverage-breakdown.md` measures observed same-project overlap. Its
individual project sets, generation date, generator revision and pinned specs
commit are not supplied by the gist; they cannot be reconstructed by subtracting
totals. Both local reports use the same pinned specs commit and six failed
project identities. Their changed native totals reflect this rule change, not
a newly selected corpus.

Generated corpus reports are validation-only and restored to their pre-run
bytes before publication. Consequently the checked-in
`specs/coverage-breakdown.md` retains the pre-change row; the refreshed report
and shards are retained in the manifest cleanup archive, with independent
counts in `patch-cycle0-latest-counts.json`.

- Specs revision: `f6b53f105b95da05276530a0754a1c71b4f16397`.
- Development base/HEAD before unpublished changes:
  `46608a56288eb2f777dcd8a58e758012ce3caaa5`.
- Retained Swagger dataset generation: `2026-08-06T08:03:27.940Z`; generator
  `test/harness/spec-dataset.ts`. It selects the dataset's latest API version,
  runs the ARM AutoRest validator pipeline and does not apply readme suppressions.
- Previous native report: `2026-08-10T09:38:18.108Z`.
- Updated native report: `2026-10-10T04:41:19.130Z`, duration 2,644,053 ms.
  Native lint sees the unprojected source program and its suppressions.
- Full command, from the development root:

  ```powershell
  mise exec -- pnpm --dir packages\typespec-lintdiff specs:typespec --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-patch-in-operation-name --concurrency 6
  ```

The required representative run used literal, case-sensitive filter
`Automation.Management`, selecting AppComplianceAutomation.Management and
Automation.Management, both successful. No failing corpus command was retried.
The passing native suite has 16 cases; strict fixture validation has 15 cases
across this rule and NonApplicationJsonType, PageableRequires200Response and
XmsPageableMustHaveCorrespondingResponse. The latter groups exercise changed
ambient diagnostics. One pre-existing NonApplicationJsonType compliance control
is marked unreviewed-ambient even though its strict command exits successfully.

Raw logs, per-project counts, original failed attempts and the generated-output
archive are retained in the queue session artifacts, not the PR. Key evidence:
`patch-cycle0-latest-counts.json`, `patch-cycle0-historical-counts.json`,
`patch-cycle0-analysis.log`, `patch-cycle0-sql-emission-evidence.log` and
`patch-cycle0-corpus-full.log`. Generator commit identity is not embedded in the
old reports; the current source revision above and unpublished reviewed diff
identify this run's generator context.

## Diagnostic identities and complete project sets

Before compile filtering, Swagger has 17 findings and native lint has 26.
After excluding the six failed projects, the counts are 14 and 23.
Conservative identities produce:

| Identity                                     | Count |
| -------------------------------------------- | ----- |
| Swagger project + file + JSON path           | 14    |
| Swagger project + JSON path, ignoring file   | 14    |
| Native project + source file + line + column | 23    |

Thus no emitted-file duplication explains this run's gap. Fourteen positive
projects have equal one-finding counts; five have higher native counts. Summed
positive differences are nine, negative differences zero. Source locations and
Swagger JSON paths remain different identity domains, not asserted one-to-one
matches.

Complete overlap (one diagnostic in each engine for each project):

| Project under `specification/`                                                            | Selected API version |
| ----------------------------------------------------------------------------------------- | -------------------- |
| authorization/resource-manager/Microsoft.Authorization/Authorization/AccessReview         | 2021-12-01-preview   |
| automation/Automation.Management                                                          | 2024-10-23           |
| azurearcdata/resource-manager/Microsoft.AzureArcData/AzureArcData                         | 2026-03-01-preview   |
| cdn/resource-manager/Microsoft.Cdn/Cdn                                                    | 2026-04-01-preview   |
| cognitiveservices/CognitiveServices.Management                                            | 2026-07-01           |
| cost-management/resource-manager/Microsoft.CostManagement/CostManagement                  | 2025-03-01           |
| dataprotection/resource-manager/Microsoft.DataProtection/DataProtection                   | 2026-04-01-preview   |
| devcenter/resource-manager/Microsoft.DevCenter/DevCenter                                  | 2026-01-01-preview   |
| eventhub/resource-manager/Microsoft.EventHub/Eventhub                                     | 2026-07-01-preview   |
| hybridcompute/resource-manager/Microsoft.HybridCompute/HybridCompute                      | 2026-07-15           |
| machinelearningservices/MachineLearningServices.Management                                | 2026-05-15-preview   |
| recoveryservicesbackup/resource-manager/Microsoft.RecoveryServices/RecoveryServicesBackup | 2026-05-31-preview   |
| storage/Storage.Management                                                                | 2026-04-01           |
| web/resource-manager/Microsoft.Web/AppService                                             | 2026-07-15           |

Validator-only list: **empty**. Complete native-only list and attribution:

| Project under `specification/`                                                | Selected version   | Native count | Source targets / disposition                                                                            |
| ----------------------------------------------------------------------------- | ------------------ | ------------ | ------------------------------------------------------------------------------------------------------- |
| advisor/resource-manager/Microsoft.Advisor/Advisor                            | 2026-03-01-preview | 1            | `ResourceRecommendationBase.tsp:45`, `patch`; historical-only, exclude from selected-version comparison |
| apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement          | 2025-09-01-preview | 2            | `ApiManagementServiceResource.tsp:482,511`, quota update names; SDK overrides                           |
| datafactory/resource-manager/Microsoft.DataFactory/DataFactory                | 2018-06-01         | 1            | `IntegrationRuntimeResource.tsp:349`, `integrationRuntimeNodesUpdate`; SDK override                     |
| securityinsights/resource-manager/Microsoft.SecurityInsights/SecurityInsights | 2025-10-01-preview | 1            | `Recommendation.tsp:50`, `recommendation`; emitted group shortcut                                       |
| sql/resource-manager/Microsoft.Sql/SQL                                        | 2025-02-01-preview | 4            | `Database.tsp:463,511` and `ManagedDatabase.tsp:284,336`; sensitivity-label SDK overrides               |

The SDK-overridden endpoints are present in the selected Swagger files, proving
their selected-version attribution without a guessed filename filter.
SecurityInsights' `Recommendation` and `Recommendations` are added at the
selected `2025-10-01-preview` version and its PATCH endpoint is emitted there.
Advisor's explicit removal before its selected version establishes its exclusion;
no production suppression or projection heuristic was added.

Compile failures (excluded from both sides, complete list under `specification/`):

- deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices
- monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups
- network/resource-manager/Microsoft.Network/Network/Network
- quota/resource-manager/Microsoft.Quota/Quota
- resources/resource-manager/Microsoft.Resources/deployments
- servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker

Their diagnostics/statuses and raw files are retained in the machine evidence.
Three target-rule findings from each engine belong to failed projects and are
not behavioral evidence. No passing result is claimed for them.

## Supported-shape and emission matrix

Swagger selects PATCH `operationId` in `paths` and `x-ms-paths`. Empty/non-string
IDs and IDs without underscores are exempt. Its case-sensitive acceptance is
`^(\w+)_(Update)` or `^(Update)`. Research-only AutoRest
`src/utils.ts:81-124` resolves explicit IDs, client names/locations, then
interface/namespace names; lines 146-151 capitalize underscore-separated parts.
None of these emitter branches are implemented by the native lint.

| Authored shape                                                                       | Support / validity                                            | Native check                    | Emitted selected field/category                | Swagger result                      | Native result           | Evidence                                                                                    |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------- | ---------------------------------------------- | ----------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| Standard ARM `modify is ArmResourcePatchSync<Widget, Properties = WidgetProperties>` | Supported customization, compiles                             | PATCH authored prefix           | `Widgets_Modify`                               | Warning                             | Warning on `modify`     | template-name-violation fixture, native documented example                                  |
| Same template named `update`                                                         | Supported, compiles                                           | Prefix accepted                 | `Widgets_Update`                               | None                                | None                    | template-name-compliance fixture                                                            |
| `UpdateTags`                                                                         | Compiler-valid native semantic shape                          | Case-insensitive prefix         | Ungrouped `UpdateTags` under service namespace | Exempt ungrouped ID                 | None                    | Native accepted-name predicate tests                                                        |
| `modify`, PATCH 200/201/202/204                                                      | Compiler-valid native semantic shapes                         | Status independent              | Ungrouped `Modify` in minimal native tests     | Exempt ungrouped ID                 | Warning                 | Four native response-code tests; grouped standard fixture proves ordinary Swagger violation |
| Interface named `UpdateWidgets`, method `modify`                                     | Supported native semantic shape                               | Method, not interface name      | Group can begin with Update                    | Group-prefix alternative may accept | Warning                 | Native interface predicate test and validator regex                                         |
| `patch_Update`                                                                       | Supported native semantic shape                               | Name does not start with update | Grouped ID can contain `_Update`               | Regex may accept grouping layout    | Warning                 | Native underscore predicate test and resolver/regex                                         |
| Non-PATCH endpoint                                                                   | Supported, compiles                                           | Verb excluded                   | PATCH-selected field absent                    | Not selected                        | None                    | Native non-PATCH test                                                                       |
| Data-plane service                                                                   | Out of this ARM policy, not invalid                           | Mixed-runner guard excludes     | Swagger rule catalog remains Both              | Depends on emitted ID               | None from this rule     | Paired ARM/data-plane guard test; official data-plane ownership                             |
| SDK/client name overrides                                                            | Existing corpus endpoints; not needed to author native policy | Authored prefix only            | `Group_Update`                                 | None                                | Warning                 | ApiManagement, DataFactory and SQL below                                                    |
| Removed historical operation                                                         | Supported versioned source                                    | Unprojected authored endpoint   | Absent at selected version                     | Not selected                        | Warning in raw source   | Advisor below                                                                               |
| Generic operation template                                                           | Supported template, not a concrete endpoint                   | Not visited as endpoint         | No endpoint field for declaration              | Not selected                        | None                    | Compute/DesktopVirtualization corpus and supported template fixtures                        |
| Out-of-service client override                                                       | Client customization, not ARM HTTP-service endpoint           | Not visited as endpoint         | No selected service endpoint                   | Not selected                        | None                    | Search `Customizations` namespace below                                                     |
| Explicit ID, ungrouped ID, historical renamed name or language-scoped SDK name       | Emission metadata outside native contract                     | Still authored prefix only      | Resolver-specific override/exemption           | Depends on emitted value            | Independent of metadata | Resolver/validator source evidence; not claimed exhaustive fixture equivalence              |

These rows distinguish supported native decisions from emitted-name comparison
differences. Native tests register OpenAPI transitively for ARM compilation but
do not author OpenAPI decorators; AutoRest and TCGC imports are mocked to fail.
Template traversal is evidenced by migration fixtures/corpus rather than a
framework-only native test.

## Code-backed gap examples

### Gap example: generic template findings removed

- **Classification:** count-only / former native-only projects
- **Status:** fixed
- **Project/API version:** Compute / `2026-03-01`, ComputeDisk / `2026-03-02`,
  ComputeGallery / `2025-12-03`, DesktopVirtualization / `2026-04-01-preview`
- **Source:** Compute `common/operations.tsp:119,145`; DesktopVirtualization
  `CustomOperations.tsp:27,56`

```typespec
update is ComputeCustomPatchSync<AvailabilitySet, AvailabilitySetUpdate>;
```

This is the concrete `AvailabilitySet.tsp` alias. The generic declarations
`ComputeCustomPatchSync` and `ComputeCustomPatchAsync` in the referenced source
accept resource and patch-model template arguments; they are not themselves
service endpoints.

| Engine          | Observed result                                                                    |
| --------------- | ---------------------------------------------------------------------------------- |
| Swagger         | No target warning for these projects; template declarations are not endpoints      |
| Previous native | 16 + 4 + 7 Compute findings and 12 DesktopVirtualization findings on generic names |
| Updated native  | No findings in these four projects; concrete `update` endpoints comply             |

**Explanation:** the generic listener reported template instantiations at shared
declaration locations. Resolving actual HTTP-service endpoints eliminates all
39 findings. This does not justify reimplementing compiler template filtering.

**Disposition:** production HTTP-surface fix, supported template fixtures and
full-corpus regression evidence.

### Gap example: out-of-service client customization removed

- **Classification:** former native-only
- **Status:** fixed
- **Project/API version:** Search / `2026-09-01-preview`
- **Source:** `Search/client.tsp:20,209` and its override application

```typespec
namespace Customizations;
```

The same file describes client-only customizations, declares PATCH operation
`searchUpdateCustomization` outside the service, and applies:

```typespec
@@Azure.ClientGenerator.Core.override(
  SearchServices.update,
  searchUpdateCustomization,
  "go,csharp,javascript"
);
```

| Engine          | Observed result                                   |
| --------------- | ------------------------------------------------- |
| Swagger         | No target warning                                 |
| Previous native | One warning on the client-only customization      |
| Updated native  | None; it is outside the resolved ARM HTTP service |

**Explanation:** a client replacement declaration is not an authored endpoint
in the selected service. **Disposition:** same concrete-endpoint surface fix;
no SDK inspection added to production.

### Gap example: historical Advisor operation

- **Classification:** native-only
- **Status:** population mismatch
- **Project/API version:** Advisor / `2026-03-01-preview`
- **Source:** `ResourceRecommendationBase.tsp:45`

```typespec
@added(Versions.v2025_05_01_preview)
@removed(Versions.v2026_02_01_preview)
@patch(#{ implicitOptionality: false })
patch is ArmCustomPatchSync<
  ResourceRecommendationBase,
  PatchModel = TrackedRecommendationPropertiesPayload,
  BaseParameters = Azure.ResourceManager.Foundations.ExtensionBaseParameters,
  Error = ArmDefaultErrorResponse
>;
```

The replacement `update` is added at `v2026_02_01_preview`; dataset metadata
selects `2026-03-01-preview`.

| Engine                       | Observed result                                                |
| ---------------------------- | -------------------------------------------------------------- |
| Swagger                      | No warning; historical `patch` is absent from selected version |
| Native source                | One warning on `patch`                                         |
| Selected-version attribution | Exclude this one finding                                       |

**Explanation:** source lint legitimately checks historical authoring. There is
no selected Swagger node to compare. **Disposition:** comparison attribution,
not production suppression.

### Gap example: SDK names mask authored prefixes

- **Classification:** native-only
- **Status:** intentional
- **Project/API version:** ApiManagement / `2025-09-01-preview`
- **Source:** `ApiManagementServiceResource.tsp:482`;
  `back-compatible.tsp` client decorators

```typespec
quotaByCounterKeysUpdate is QuotaCounterKeyOps.ActionSync<
  ApiManagementServiceResource,
  Request = QuotaCounterValueUpdateContract,
  Response = ArmResponse<QuotaCounterCollection>
>;
@@clientLocation(ApiManagementServiceResources.quotaByCounterKeysUpdate, "QuotaByCounterKeys");
@@clientName(ApiManagementServiceResources.quotaByCounterKeysUpdate, "Update");
```

```json
{ "operationId": "QuotaByCounterKeys_Update" }
```

| Engine  | Observed result                                                         |
| ------- | ----------------------------------------------------------------------- |
| Swagger | None; emitted grouped method starts with `Update`                       |
| Native  | Warning; authored `quotaByCounterKeysUpdate` does not start with update |

**Explanation:** the same resolver branch accounts for seven findings:
ApiManagement's two quota endpoints; DataFactory's
`IntegrationRuntimeNodes_Update`; SQL's `SensitivityLabels_Update`,
`RecommendedSensitivityLabels_Update`, `ManagedDatabaseSensitivityLabels_Update`
and `ManagedDatabaseRecommendedSensitivityLabels_Update`. All seven selected
emitted PATCH IDs and their source overrides were verified. The SQL outlier is
four distinct source locations, not duplicates across its two Swagger files.

**Disposition:** intentional native naming policy; suppress for shipped
compatibility rather than simulate SDK/emitter names.

### Gap example: emitted group-prefix shortcut

- **Classification:** native-only
- **Status:** intentional
- **Project/API version:** SecurityInsights / `2025-10-01-preview`
- **Source:** `Recommendation.tsp:50`, `back-compatible.tsp`

```typespec
@patch(#{ implicitOptionality: false })
recommendation is Extension.CustomPatchSync<
  workspaceExternalResource,
  Recommendation,
  PatchModel = RecommendationPatch,
  Error = CloudError
>;
@@clientLocation(Recommendations.recommendation, "Update");
```

```json
{ "operationId": "Update_Recommendation" }
```

| Engine  | Observed result                            |
| ------- | ------------------------------------------ |
| Swagger | None; `^(Update)` accepts the group prefix |
| Native  | One warning on authored `recommendation`   |

**Explanation:** the validator accepts an Update group even though its method
is Recommendation. **Disposition:** do not copy the regex shortcut into a
native authored-method policy.

## Final conclusion

All observed Swagger-positive successful projects remain covered. Supported
standard ARM compliance/violation examples and 16 native cases establish the
authored-endpoint contract. The five native-only projects are fully attributed;
no extra production special case is justified. The migration remains
**partial Swagger coverage**, not functional equality with emitted-operation-ID
validation. Ungrouped IDs, explicit overrides, case-sensitive regex details,
historical naming metadata and failed projects are not made equivalent by
corpus overlap or count equality.
