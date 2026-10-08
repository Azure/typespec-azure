# PostResponseCodes migration

## Result and gap summary

The full 468-project run assessed 462 successfully compiled projects. The
retained selected-version Swagger population has **724 findings / 112 projects**;
the mapped TypeSpec rules produce **82 raw warnings / 35 projects**, all from the
new opt-in `no-empty-post-response` rule. All 35 projects overlap; **77 are
validator-only**, with no TypeSpec-only projects. Of the 82 targets, 80 are
reachable in the selected versions and two belong to explicitly removed
historical operations.

The focused native fix catches synchronous resource POST 200 responses without
a payload, previously accepted by the enabled official rules. It does not
duplicate their status-code or async checks. Swagger also checks all provider
POSTs and serialized LRO response sets, outside this narrowly scoped check.
The six baseline compile failures exclude 448 of 1,172 retained findings.
Provider traversal, LRO representation, and unmatched operation correspondence
remain partly unresolved: this is **partial migration**, not full functional
equivalence or diagnostic-count equality.

## Source of truth and native coverage gate

- Validator [implementation](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/post-response-codes.ts),
  [documentation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/post-response-codes.md),
  and [tests](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/test/post-response-codes.test.ts).
- Executed validator: the installed `@microsoft.azure/openapi-validator-rulesets`
  package used by the fixture harness. Its `dist/spectral/functions/post-response-codes.js`
  matches the inspected source function's response-set and body checks.
- Registration: `dist/spectral/az-arm.js`, rule `PostResponseCodes`, severity
  error, ARM, RPC-Async-V1-11/14 and RPC-POST-V1-02/03. The resolved Spectral
  selector includes POST operations in both `paths` and `x-ms-paths`.
- The source checkout was fetched from canonical
  `Azure/typespec-azure:feature/lintdiff-migration-new` at
  `adf0d2865887d9e12609d7a4d398b96211510a85`. An exact rule-title PR query found
  no previous development or promotion PR.
- Official inventory evidence comes from ARM's rule docs and registration,
  plus the manually maintained RPC guideline coverage table's section
  **12.1 POST response codes**. That row credits
  `arm-post-operation-response-codes`, but its implementation is partial for
  the synchronous missing-body requirement.

### Material checks and ownership

| Validator behavior                                          | Native ownership / disposition                                                                                                                      |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Synchronous status set `{200, default}` or `{204, default}` | Enabled `arm-post-operation-response-codes`; reused, not duplicated                                                                                 |
| 200 response must have a schema, including synchronous POST | Async bodies already checked by official POST rule; synchronous resource POST gap fixed here                                                        |
| 202/204 must not have a schema                              | Enabled `no-response-body`; official POST rule also checks async 202; reused                                                                        |
| Async extension must be true                                | Native LRO semantics are `getLroMetadata`, not OpenAPI extension overrides; not recreated                                                           |
| Legacy initial response sets include final 200/204          | Modern ARM templates can represent final responses through polling/final-operation metadata; exact serialized set parity is not the native contract |
| Every POST in all Swagger paths, including provider actions | This focused rule follows official resource-operation traversal; broader provider-action coverage remains unclassified, not silently implemented    |
| Empty or missing response object                            | Swagger representation is not reproduced in a rule inspecting resolved native HTTP responses                                                        |

## Native contract and implementation

- **Requirement:** synchronous ARM resource POST 200 responses contain an HTTP
  payload; use 204 for a response containing only metadata.
- **Supported customization:** `ArmResourceActionSync` accepts a named
  `Response` argument. Both bodyless 200 and corrected `ArmNoContentResponse`
  customization compile without prerequisite errors.
- **Semantic layer:** use resolved `httpOperation.responses` from
  `getArmResources`; exclude native LROs with `getLroMetadata`.
- **Traversal:** the same resource lifecycle/action population as the official
  POST status-code rule. No custom recursive model traversal, source-name
  parsing, provider-namespace heuristic, or emission is required.
- **Diagnostic:** one warning per offending operation, even when multiple
  variants share status 200. Target the authored operation rather than an
  emitted response object.
- **Body:** HTTP payload presence, not whether a model has properties. Headers
  do not count as a body; an explicit empty model body does.
- **Promotion:** ARM semantic ownership. Keep a separate disabled rule rather
  than silently adding a diagnostic to the enabled official POST rule.
- **Activation:** the local `all` ruleset explicitly opts into the new check for
  comparison; `recommended` remains unchanged. An official ruleset must register
  the promoted rule as `false` absent separate enablement approval.
- **Dependencies:** compiler and supported ARM/Azure Core metadata only.
  Production logic does not import an emitter, OpenAPI, TCGC, or unsafe
  compiler APIs.

## Supported-shape matrix

HTTP payload presence answers the native question directly; the emitted-field
column is comparison evidence, not production logic.

| Authored shape                                                         | Validity / support                                                               | Native decision / emitted field                                          | Swagger expectation                                                                  | Focused evidence                                                                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Template response `{ @statusCode _: 200; }`                            | Supported ARM customization; no compiler errors                                  | Body absent; emitted 200 schema absent                                   | Missing-schema diagnostic                                                            | `post-empty-200`, native template customization test                                                       |
| 200 with headers only                                                  | Supported native response metadata                                               | Body absent; no payload                                                  | Missing-schema diagnostic expected                                                   | Native `headers are not a body` test; no extra emission simulation                                         |
| 200 with an implicit model property                                    | Supported native payload                                                         | Body present                                                             | No missing-schema finding                                                            | Native implicit-model-body control                                                                         |
| 200 with explicit scalar `@body`                                       | Supported HTTP payload; fixture also reports unrelated ARM content-type guidance | Body present; emitted schema is `{ "type": "string" }`                   | No finding for this rule                                                             | `post-body-200`, native scalar control                                                                     |
| 200 with explicit empty model body                                     | Supported HTTP payload; body existence is distinct from model emptiness          | Body present                                                             | Missing-schema check does not require properties                                     | Native empty-model-payload control                                                                         |
| 200 union with both payload and headers-only variants                  | Supported response union; no unrelated compiler warnings                         | At least one variant has no body; one operation warning                  | Serialized schema merge need not preserve variant distinction                        | Native mixed-variant regression; native contract intentionally takes precedence over merged representation |
| 204 without a body                                                     | Supported template customization                                                 | No 200 body check; emitted 204 schema absent                             | Compliant                                                                            | `post-no-content-204`, exact documentation-example control                                                 |
| 201 with a body                                                        | Supported authoring; official status rule warns                                  | New rule does not repeat status check                                    | Invalid synchronous status set                                                       | Existing `post-extra-201`; native no-duplication control                                                   |
| `ArmResourceActionAsync<..., Response = OkResponse>` with bodyless 200 | Supported ARM async customization                                                | Excluded by LRO metadata despite matching the 200 missing-body predicate | A serialized bodyless 200 triggers the validator; legacy response parity is separate | Native LRO exclusion test asserts LRO metadata, bodyless 200, and no target diagnostic                     |
| Bodyless 200 on DELETE                                                 | Outside POST contract                                                            | Excluded by verb                                                         | POST validator does not inspect it                                                   | Native verb control                                                                                        |

The native suite contains 12 tests and asserts the exact operation location for
violations. It loads no emitter. The violating and corrected documentation
snippets are exercised with the same template and response customization used
in the published examples, adding only imports and an `Employee` resource.
Minimal handwritten cases isolate HTTP metadata, payload, verb, and union
decisions; they are not substituted for the representative template examples.

The LRO control uses `ArmResourceActionAsync<Employee, void, Response = OkResponse>`
and verifies that native LRO metadata is present and a 200 response variant has
no HTTP body before asserting an empty target diagnostic set. This exercises
the rule-owned LRO exclusion rather than passing merely because the operation
has no 200 response. It replaces a no-content async control with only
202/default responses; the suite remains 12 cases. Independent review confirmed
that removing the LRO guard produces a warning for this supported bodyless-200
control. The production predicate is unchanged.

## Focused fixture evidence

| Fixture               | Validator findings |    Target TypeSpec findings | Interpretation                                           |
| --------------------- | -----------------: | --------------------------: | -------------------------------------------------------- |
| `post-empty-200`      |                  1 |         1 new local warning | Previously uncovered synchronous 200 body requirement    |
| `post-extra-201`      |                  1 | 1 existing official warning | Existing status-code coverage retained, no new duplicate |
| `post-body-200`       |                  0 |                           0 | Payload presence is compliant                            |
| `post-no-content-204` |                  0 |                           0 | Correct no-content status is compliant                   |

Both compliant fixtures have explicitly reviewed ambient warning expectations:
common-types version, provisioning-state property, list operation, and example
metadata. The scalar-body fixture additionally records ARM content-type guidance.
These are unrelated to the POST response-body predicate, are not suppressed,
and are not counted as evidence that the target rule fired.

Adding the local mapping causes the harness to enable its explicit `all` ruleset
for the existing 201 fixture too. Its updated diagnostic snapshot therefore
contains reviewed incidental local warnings; the original official status-code
warning remains unchanged and there is no `no-empty-post-response` warning.

### Gap example: missing synchronous 200 payload

- **Classification:** validator-only native semantic gap before the fix.
- **Status:** fixed for the stated resource-operation contract.
- **Project/API version:** focused `Microsoft.TestService` / `2024-01-01`.
- **Source:** `post-empty-200/main.tsp`, `WidgetActions.reset`.

```tsp
reset is ArmResourceActionSync<Widget, void, Response = { @statusCode _: 200; }>;
```

The stored `output.json` contains:

```json
{
  "responses": {
    "200": { "description": "Azure operation completed successfully." },
    "default": {
      "description": "An unexpected error response.",
      "schema": {
        "$ref": "../../../../../common-types/resource-management/v5/types.json#/definitions/ErrorResponse"
      }
    }
  }
}
```

| Engine                      | Observed result                                     |
| --------------------------- | --------------------------------------------------- |
| Swagger validator           | One missing-schema finding at the POST operation    |
| Existing official POST rule | No finding: the 200/default status set is allowed   |
| Existing `no-response-body` | No finding: POST 200 is explicitly exempt           |
| New local native rule       | One warning on `reset`, advising 204 for no content |

The upstream diagnostic incorrectly calls this synchronous case “LRO POST” in
its message, but its body check is outside the async branch. The native message
describes the actual synchronous requirement instead.

**Disposition:** focused native fix, no duplicate status/async diagnostics.

### Gap example: report populations and identity

- **Classification:** count-only/report-population mismatch.
- **Status:** retained as comparison evidence, not a rule change.
- **Source:** `docs/coverage_old.md`, original `specs/coverage-breakdown.md`, and
  retained `specs/results/by-rule/PostResponseCodes.json`.

The external report (`docs/coverage_old.md`) states **450 compiled projects / 210 rules** and labels
this rule `template`, with **109 validator projects**, no fired lint or official
diagnostics, and 0.0% observed firing. Its source revision and generator revision
are not recorded, so individual missing projects cannot be reconstructed.

The checked-in observed report at the source base states **462/468 projects /
215 known rules**, **112 validator projects**, **724 validator diagnostics**,
and no mapped TypeSpec diagnostics. Its source spec revision is
`f6b53f105b95da05276530a0754a1c71b4f16397`. The retained validator shard itself
has **1,172 raw findings in 114 projects**; raw operation-path identities collapse
to **725** before selecting the successfully compiled population.

The external report does not record its source/generator revision or publication
date. The original checked-in report is schema 6, generated
`2026-08-10T09:38:18.108Z`; the retained dataset was generated
`2026-08-06T08:03:27.940Z`. The current schema-7 full analysis is generated
`2026-10-08T05:47:38.543Z` and took 1,112,381 ms. The old successful population
and its six failed project identities match the current run.

The current selected-population extraction establishes the 1,172-to-724
difference exactly: **443 Network findings and five deployments findings** are
excluded with failed projects. The 724 selected findings occupy 684 distinct
project/operation-path identities; several checks can report on one operation.
The raw whole-shard 725 path identities are not the selected diagnostic count.
No diagnostic-level normalized equivalence metric is configured for this rule.
These identities do not establish one-to-one correspondence with 82 authored
TypeSpec operation warnings.

The external report's 109 versus 112 projects remains unreconstructable without
its missing provenance. Template/official mapping credit is not evidence that a
warning fires on every supported customization.

## Corpus evidence

The existing full runner completed naturally with exit 0 at
`2026-10-08T05:47:38.543Z`, without retries or timeout overrides. It processed
all 468 projects: 462 successes and six baseline failures. Its 52,008 total
diagnostics include other rules and failed compilations and are not this rule's
comparison count.

| Measure                                     | Validator | Mapped TypeSpec |
| ------------------------------------------- | --------: | --------------: |
| Compared diagnostics                        |       724 |          82 raw |
| Affected successful projects                |       112 |              35 |
| Same-project overlap                        |        35 |              35 |
| One-sided projects                          |        77 |               0 |
| Selected-version reachable TypeSpec targets |         — |              80 |

The mapping includes the local missing-body rule and the existing official POST
status rule. Only the local rule fired in this corpus. The comparison's 31.25%
project overlap is observational, not a semantic-equivalence percentage.

### Selected API versions and historical targets

The existing corpus runner writes selected-version HTTP graphs for these
projects. Matching each native warning's exact source file, line and column
against the graph's reachable operation locations establishes that 80 of 82
targets remain reachable in the metadata-selected API versions. This is target
attribution, not an independent projected reexecution of every response shape.
It does not prove universal historical or emitted-schema parity.

Two targets are historical-only, corroborated by their actual source decorators:

| Project / selected version                          | Target                                       | Source evidence                                                                                     |
| --------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ContainerApps / `2026-01-01`                        | `LogicApp.tsp:98`, `deployWorkflowArtifacts` | `@removed(Versions.v2026_01_01)`; `ArmResourceActionSync<..., OkResponse, ...>`                     |
| ServiceFabricManagedClusters / `2026-05-01-preview` | `ManagedCluster.tsp:179`, `postNoBody`       | `@removed(Versions.v2026_05_01_preview)`; `ArmResourceActionSync<ManagedCluster, void, OkResponse>` |

Both projects also have selected-version findings, so excluding these two
targets leaves all 35 overlapping projects. There are no TypeSpec-only projects
requiring further one-sided version attribution. The production rule retains
both legitimate historical diagnostics; it is not altered to match Swagger's
selected-version population.

### Real-service examples of the fixed native gap

- **ApiManagement / `2025-09-01-preview`:**
  `AuthorizationContract.tsp:121`, `confirmConsentCode`, uses
  `Response = OkResponse & { @header("ETag") eTag: string; }`. Header metadata
  does not supply a payload. The project has three validator findings and one
  new native warning.
- **Automation / `2024-10-23`:** `Job.tsp:129`, `suspend`, uses
  `ArmResourceActionSync<Job, void, OkResponse, ...>`. The project has ten
  validator findings and nine native warnings, including `stop` and `resume`.
- **ContainerApps / `2026-01-01`:** `Revision.tsp:58`, `activateRevision`,
  uses `ArmResourceActionSync<Revision, void, OkResponse, ...>`; deactivate and
  restart use the same response. All three remain selected-version reachable.
  The fourth raw warning is the removed LogicApp operation above.

These observations corroborate the minimal fixture; they are not blanket
assertions that every warning maps to a particular retained Swagger finding.

### Validator behavior remaining outside the focused check

The selected 724 findings break down by validator check as follows:

| Check                      | Findings | Disposition                                                                                                 |
| -------------------------- | -------: | ----------------------------------------------------------------------------------------------------------- |
| Missing schema on 200      |      375 | Includes the fixed sync resource contract, async shapes and provider actions; not all attributed one-to-one |
| Legacy async response set  |      275 | Not duplicated by a sync payload rule; native LRO representation requires separate assessment               |
| Sync response set          |       34 | Existing official status rule owns native resource cases; broader traversal remains unresolved              |
| Schema on 202              |       24 | Existing body/status rules own native cases; no new duplicate                                               |
| Missing true LRO extension |       15 | OpenAPI marker representation is not reproduced in production                                               |
| Schema on 204              |        1 | Existing `no-response-body` owns native cases                                                               |

Counts in this table are validator findings, not disjoint explanations for the
numerical difference with operation warnings. The 77 one-sided projects and
within-project differences remain **partially attributed**, not presumed false
positives or silently classified as intentional.

#### Provider-action traversal example

**ClassicAdmin / `2015-07-01`:** `routes.tsp:41` declares
`elevateAccess is ArmProviderActionSync<Response = OkResponse>;`.
The exact retained operation `/providers/Microsoft.Authorization/elevateAccess`
has 200 without schema and default with an error schema, and no LRO extension.
Swagger reports one missing-schema finding; the mapped resource-operation
rules report none. `getArmResources`-based traversal does not include this
provider action. This is a concrete population limitation outside the authorized
resource-operation check, not evidence that provider bodylessness is acceptable
or that a broader rule should be silently implemented.

#### Legacy async representation example

**ApiCenter / `2024-06-01-preview`:**
`APIDefinition.tsp`, `ApiDefinitions.importSpecification`, is authored as
`ArmResourceActionAsync<ApiDefinition, ApiSpecImportRequest, OkResponse,
LroHeaders = ArmLroLocationHeader<FinalResult = void> & ...>`.
Its exact retained Swagger operation has 200 and 202 without schemas, a default
error schema, `x-ms-long-running-operation: true`, and final-state-via `location`.
The validator reports the schema-less 200. The new rule intentionally inspects
synchronous operations, not this async template. No mapped official diagnostic
fires in this project. Whether the legacy 200 representation should be changed
or covered by additional native enforcement is unresolved here; this example
does not establish universal LRO equivalence or justify emitter simulation.

### Compile failures and population effect

All six failure identities match the pristine checked-in baseline. Their
existing source-shape errors are unrelated to this new warning; they are not
silently counted as assessed projects.

| Project (relative to `specification/`)                                                     | Representative existing error                                              | Excluded validator findings |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------: |
| `deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices` | `@typespec/http/duplicate-body`, `client.tsp:469`                          |                           0 |
| `monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`                  | `@typespec/http/missing-uri-param`, subscription/resource-group parameters |                           0 |
| `network/resource-manager/Microsoft.Network/Network/Network`                               | `@typespec/http/missing-uri-param`, `applicationGatewayAvailableSslOption` |                         443 |
| `quota/resource-manager/Microsoft.Quota/Quota`                                             | `@typespec/http/missing-uri-param`, subscription/resource-group parameters |                           0 |
| `resources/resource-manager/Microsoft.Resources/deployments`                               | `@typespec/http/duplicate-body`, legacy operation template                 |                           5 |
| `servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`                     | `@typespec/http/duplicate-body`, `client.tsp:195`                          |                           0 |

This baseline comparison is read-only corpus evidence, not a native-test timeout
or baseline retry. No service source or suppressions were modified.

### Same-project overlap (35 projects)

Paths below are relative to `specification/` in the pinned specs checkout.

| Project                                                                                              | Selected API version | Validator | Raw TypeSpec | Selected-reachable targets |
| ---------------------------------------------------------------------------------------------------- | -------------------- | --------: | -----------: | -------------------------: |
| `apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement`                               | `2025-09-01-preview` |         3 |            1 |                          1 |
| `app/resource-manager/Microsoft.App/ContainerApps`                                                   | `2026-01-01`         |         5 |            4 |                          3 |
| `authorization/resource-manager/Microsoft.Authorization/Authorization/Authorization`                 | `2024-09-01-preview` |         2 |            2 |                          2 |
| `automation/Automation.Management`                                                                   | `2024-10-23`         |        10 |            9 |                          9 |
| `cognitiveservices/CognitiveServices.Management`                                                     | `2026-07-01`         |         4 |            2 |                          2 |
| `compute/resource-manager/Microsoft.Compute/Compute/Compute`                                         | `2026-03-01`         |        42 |            2 |                          2 |
| `computeschedule/resource-manager/Microsoft.ComputeSchedule/ComputeSchedule`                         | `2026-04-15-preview` |         2 |            2 |                          2 |
| `containerregistry/resource-manager/Microsoft.ContainerRegistry/RegistryTasks`                       | `2025-03-01-preview` |         1 |            1 |                          1 |
| `cost-management/resource-manager/Microsoft.CostManagement/CostManagement`                           | `2025-03-01`         |         6 |            1 |                          1 |
| `datadog/resource-manager/Microsoft.Datadog/Datadog`                                                 | `2025-12-26-preview` |         1 |            1 |                          1 |
| `datafactory/resource-manager/Microsoft.DataFactory/DataFactory`                                     | `2018-06-01`         |        14 |            6 |                          6 |
| `desktopvirtualization/resource-manager/Microsoft.DesktopVirtualization/DesktopVirtualization`       | `2026-04-01-preview` |         5 |            3 |                          3 |
| `developerhub/resource-manager/Microsoft.DevHub/DeveloperHub`                                        | `2025-03-01-preview` |         1 |            1 |                          1 |
| `devopsinfrastructure/resource-manager/Microsoft.DevOpsInfrastructure/DevOpsInfrastructure`          | `2026-07-03-preview` |         1 |            1 |                          1 |
| `devtestlabs/resource-manager/Microsoft.DevTestLab/DevTestLabs`                                      | `2018-09-15`         |        25 |            1 |                          1 |
| `domainregistration/resource-manager/Microsoft.DomainRegistration/DomainRegistration`                | `2024-11-01`         |         1 |            1 |                          1 |
| `edgeorder/resource-manager/Microsoft.EdgeOrder/EdgeOrder`                                           | `2024-02-01`         |         3 |            1 |                          1 |
| `elastic/resource-manager/Microsoft.Elastic/Elastic`                                                 | `2025-06-01`         |         8 |            3 |                          3 |
| `eventhub/resource-manager/Microsoft.EventHub/Eventhub`                                              | `2026-07-01-preview` |         5 |            2 |                          2 |
| `hdinsight/resource-manager/Microsoft.HDInsight/HDInsight`                                           | `2025-01-15-preview` |        11 |            1 |                          1 |
| `machinelearningservices/MachineLearningServices.Management`                                         | `2026-05-15-preview` |        17 |            3 |                          3 |
| `marketplace/resource-manager/Microsoft.Marketplace/Marketplace`                                     | `2025-01-01`         |         5 |            3 |                          3 |
| `monitor/resource-manager/Microsoft.Insights/Insights/ActionGroupsApi`                               | `2024-10-01-preview` |         2 |            1 |                          1 |
| `providerhub/ProviderHub.Management`                                                                 | `2024-09-01`         |         4 |            1 |                          1 |
| `purview/resource-manager/Microsoft.Purview/Purview`                                                 | `2024-04-01-preview` |         3 |            1 |                          1 |
| `reservations/resource-manager/Microsoft.Capacity/Reservations/Reservations`                         | `2022-11-01`         |         4 |            2 |                          2 |
| `security/resource-manager/Microsoft.Security/Security/IoTSecurityAPI`                               | `2019-08-01`         |         1 |            1 |                          1 |
| `securityinsights/resource-manager/Microsoft.SecurityInsights/SecurityInsights`                      | `2025-10-01-preview` |         6 |            3 |                          3 |
| `servicebus/resource-manager/Microsoft.ServiceBus/ServiceBus`                                        | `2026-07-01-preview` |         6 |            5 |                          5 |
| `servicefabricmanagedclusters/resource-manager/Microsoft.ServiceFabric/ServiceFabricManagedClusters` | `2026-05-01-preview` |        18 |            2 |                          1 |
| `sql/resource-manager/Microsoft.Sql/SQL`                                                             | `2025-02-01-preview` |        36 |            6 |                          6 |
| `storage/Storage.Management`                                                                         | `2026-04-01`         |         9 |            2 |                          2 |
| `storagecache/resource-manager/Microsoft.StorageCache/StorageCache`                                  | `2026-01-01`         |        25 |            2 |                          2 |
| `storagesync/resource-manager/Microsoft.StorageSync/StorageSync`                                     | `2022-09-01`         |         8 |            2 |                          2 |
| `web/resource-manager/Microsoft.Web/AppService`                                                      | `2026-07-15`         |        78 |            3 |                          3 |

### Validator-only (77 projects)

Paths below are relative to `specification/` in the pinned specs checkout.

| Project                                                                                     | Selected API version | Validator | Raw TypeSpec | Selected-reachable targets |
| ------------------------------------------------------------------------------------------- | -------------------- | --------: | -----------: | -------------------------: |
| `advisor/resource-manager/Microsoft.Advisor/Advisor`                                        | `2026-03-01-preview` |         1 |            0 |                          0 |
| `apicenter/ApiCenter.Management`                                                            | `2024-06-01-preview` |         1 |            0 |                          0 |
| `appconfiguration/resource-manager/Microsoft.AppConfiguration/AppConfiguration`             | `2025-08-01-preview` |         2 |            0 |                          0 |
| `applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/ComponentAPIs` | `2015-05-01`         |         3 |            0 |                          0 |
| `applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/Components`    | `2020-02-02`         |         1 |            0 |                          0 |
| `authorization/resource-manager/Microsoft.Authorization/Authorization/ClassicAdmin`         | `2015-07-01`         |         1 |            0 |                          0 |
| `authorization/resource-manager/Microsoft.Authorization/Authorization/RoleManagementAlerts` | `2022-08-01-preview` |         4 |            0 |                          0 |
| `azure-kusto/resource-manager/Microsoft.Kusto/Kusto`                                        | `2025-02-14`         |         8 |            0 |                          0 |
| `azurearcdata/resource-manager/Microsoft.AzureArcData/AzureArcData`                         | `2026-03-01-preview` |         1 |            0 |                          0 |
| `azuredependencymap/resource-manager/Microsoft.DependencyMap/DependencyMap`                 | `2025-07-01-preview` |         3 |            0 |                          0 |
| `azurestackhci/resource-manager/Microsoft.AzureStackHCI/StackHCI`                           | `2026-05-01-preview` |         4 |            0 |                          0 |
| `azurestackhci/resource-manager/Microsoft.AzureStackHCI/StackHCIVM`                         | `2026-04-01-preview` |         5 |            0 |                          0 |
| `batch/resource-manager/Microsoft.Batch/Batch`                                              | `2025-06-01`         |         1 |            0 |                          0 |
| `billing/resource-manager/Microsoft.Billing/Billing`                                        | `2024-04-01`         |         2 |            0 |                          0 |
| `cdn/resource-manager/Microsoft.Cdn/Cdn`                                                    | `2026-04-01-preview` |        12 |            0 |                          0 |
| `chaos/resource-manager/Microsoft.Chaos/Chaos`                                              | `2026-08-01-preview` |         8 |            0 |                          0 |
| `communication/Communication.Management`                                                    | `2026-03-18`         |         2 |            0 |                          0 |
| `compute/resource-manager/Microsoft.Compute/Bulkactions`                                    | `2026-07-06-preview` |         4 |            0 |                          0 |
| `compute/resource-manager/Microsoft.Compute/Compute/ComputeDisk`                            | `2026-03-02`         |         3 |            0 |                          0 |
| `compute/resource-manager/Microsoft.Compute/Compute/ComputeGallery`                         | `2025-12-03`         |         1 |            0 |                          0 |
| `computebulkactions/ComputeBulkActions.Management`                                          | `2026-02-01-preview` |         1 |            0 |                          0 |
| `containerinstance/resource-manager/Microsoft.ContainerInstance/ContainerInstance`          | `2026-08-01-preview` |         3 |            0 |                          0 |
| `containerregistry/resource-manager/Microsoft.ContainerRegistry/Registry`                   | `2026-03-01-preview` |         2 |            0 |                          0 |
| `containerservice/resource-manager/Microsoft.ContainerService/aks`                          | `2026-05-02-preview` |         5 |            0 |                          0 |
| `cosmos-db/resource-manager/Microsoft.DocumentDB/DocumentDB`                                | `2026-04-01-preview` |        10 |            0 |                          0 |
| `dashboard/resource-manager/Microsoft.Dashboard/Dashboard`                                  | `2025-09-01-preview` |         1 |            0 |                          0 |
| `databasefleetmanager/resource-manager/Microsoft.DatabaseFleetManager/DatabaseFleetManager` | `2025-02-01-preview` |         5 |            0 |                          0 |
| `databoxedge/resource-manager/Microsoft.DataBoxEdge/DataBoxEdge`                            | `2023-12-01`         |         7 |            0 |                          0 |
| `datamigration/resource-manager/Microsoft.DataMigration/DataMigration`                      | `2025-09-01-preview` |         9 |            0 |                          0 |
| `dataprotection/resource-manager/Microsoft.DataProtection/DataProtection`                   | `2026-04-01-preview` |         7 |            0 |                          0 |
| `devcenter/resource-manager/Microsoft.DevCenter/DevCenter`                                  | `2026-01-01-preview` |        10 |            0 |                          0 |
| `dynatrace/resource-manager/Dynatrace.Observability/DynatraceObservability`                 | `2024-04-24`         |         1 |            0 |                          0 |
| `edge/resource-manager/Microsoft.Edge/configurationmanager`                                 | `2026-03-01`         |         9 |            0 |                          0 |
| `education/resource-manager/Microsoft.Education/Education`                                  | `2021-12-01-preview` |         3 |            0 |                          0 |
| `extendedlocation/resource-manager/Microsoft.ExtendedLocation/CustomLocations`              | `2021-08-31-preview` |         1 |            0 |                          0 |
| `fabric/resource-manager/Microsoft.Fabric/Fabric`                                           | `2025-01-15-preview` |         2 |            0 |                          0 |
| `frontdoor/resource-manager/Microsoft.Network/FrontDoor`                                    | `2025-11-01`         |         3 |            0 |                          0 |
| `hybridcompute/resource-manager/Microsoft.HybridCompute/HybridCompute`                      | `2026-07-15`         |         2 |            0 |                          0 |
| `imagebuilder/resource-manager/Microsoft.VirtualMachineImages/ImageBuilder`                 | `2025-10-01`         |         4 |            0 |                          0 |
| `iothub/resource-manager/Microsoft.Devices/IoTHub`                                          | `2026-05-01-preview` |         1 |            0 |                          0 |
| `keyvault/resource-manager/Microsoft.KeyVault/KeyVault`                                     | `2026-03-01-preview` |         2 |            0 |                          0 |
| `migrate/resource-manager/Microsoft.OffAzure/OffAzure`                                      | `2024-12-01-preview` |         1 |            0 |                          0 |
| `mongocluster/resource-manager/Microsoft.DocumentDB/MongoCluster`                           | `2026-06-15-preview` |         1 |            0 |                          0 |
| `monitor/resource-manager/Microsoft.Insights/Insights/NetworkSecurityPerimeterApi`          | `2021-10-01`         |         3 |            0 |                          0 |
| `mysql/resource-manager/Microsoft.DBforMySQL/FlexibleServers`                               | `2025-12-01-preview` |         5 |            0 |                          0 |
| `netapp/resource-manager/Microsoft.NetApp/NetApp`                                           | `2026-05-15-preview` |        26 |            0 |                          0 |
| `networkcloud/resource-manager/Microsoft.NetworkCloud/NetworkCloud`                         | `2026-07-01`         |        27 |            0 |                          0 |
| `newrelic/NewRelicObservability.Management`                                                 | `2025-05-01-preview` |         1 |            0 |                          0 |
| `operationalinsights/resource-manager/Microsoft.OperationalInsights/OperationalInsights`    | `2025-07-01`         |        11 |            0 |                          0 |
| `oracle/resource-manager/Oracle.Database/OracleDatabase`                                    | `2025-09-01`         |         1 |            0 |                          0 |
| `paloaltonetworks/resource-manager/PaloAltoNetworks.Cloudngfw/Cloudngfw`                    | `2026-05-11-preview` |         3 |            0 |                          0 |
| `peering/resource-manager/Microsoft.Peering/Peering`                                        | `2025-05-01`         |         1 |            0 |                          0 |
| `policyinsights/resource-manager/Microsoft.PolicyInsights/PolicyInsights/PolicyInsightsApi` | `2024-10-01`         |         2 |            0 |                          0 |
| `postgresql/DBforPostgreSQL.Management`                                                     | `2026-04-01-preview` |         3 |            0 |                          0 |
| `postgresqlhsc/resource-manager/Microsoft.DBforPostgreSQL/PostgresqlHsc`                    | `2023-03-02-preview` |         4 |            0 |                          0 |
| `powerbidedicated/resource-manager/Microsoft.PowerBIdedicated/PowerBIDedicated`             | `2021-01-01`         |         2 |            0 |                          0 |
| `purestorage/resource-manager/PureStorage.Block/PureStorageBlock`                           | `2026-05-01-preview` |         6 |            0 |                          0 |
| `recoveryservicesbackup/resource-manager/Microsoft.RecoveryServices/RecoveryServicesBackup` | `2026-05-31-preview` |        12 |            0 |                          0 |
| `recoveryservicessiterecovery/resource-manager/Microsoft.RecoveryServices/SiteRecovery`     | `2026-05-31-preview` |        46 |            0 |                          0 |
| `redis/resource-manager/Microsoft.Cache/Redis`                                              | `2025-08-01-preview` |         5 |            0 |                          0 |
| `redisenterprise/resource-manager/Microsoft.Cache/RedisEnterprise`                          | `2026-06-01-preview` |         7 |            0 |                          0 |
| `resources/resource-manager/Microsoft.Resources/deploymentStacks`                           | `2025-07-01`         |         3 |            0 |                          0 |
| `resources/resource-manager/Microsoft.Resources/resources`                                  | `2025-04-01`         |         1 |            0 |                          0 |
| `scvmm/ScVmm.Management`                                                                    | `2025-03-13`         |         6 |            0 |                          0 |
| `search/resource-manager/Microsoft.Search/Search`                                           | `2026-09-01-preview` |         1 |            0 |                          0 |
| `security/resource-manager/Microsoft.Security/Security/AlertsAPI`                           | `2022-01-01`         |         1 |            0 |                          0 |
| `security/resource-manager/Microsoft.Security/Security/GovernanceAPI`                       | `2022-01-01-preview` |         1 |            0 |                          0 |
| `security/resource-manager/Microsoft.Security/Security/SecurityConnectorsDevOpsAPI`         | `2025-11-01-preview` |         1 |            0 |                          0 |
| `security/resource-manager/Microsoft.Security/Security/SecuritySolutionsAPI`                | `2020-01-01`         |         1 |            0 |                          0 |
| `serialconsole/resource-manager/Microsoft.SerialConsole/SerialConsole`                      | `2024-07-01`         |         2 |            0 |                          0 |
| `signalr/resource-manager/Microsoft.SignalRService/SignalRService`                          | `2025-01-01-preview` |         1 |            0 |                          0 |
| `solutions/Solutions.Management`                                                            | `2023-12-01-preview` |         3 |            0 |                          0 |
| `sphere/resource-manager/Microsoft.AzureSphere/AzureSphere`                                 | `2024-04-01`         |         2 |            0 |                          0 |
| `sqlvirtualmachine/resource-manager/Microsoft.SqlVirtualMachine/SqlVirtualMachine`          | `2023-10-01`         |         3 |            0 |                          0 |
| `subscription/resource-manager/Microsoft.Subscription/Subscription`                         | `2025-11-01-preview` |         1 |            0 |                          0 |
| `vmware/resource-manager/Microsoft.AVS/AVS`                                                 | `2025-09-01`         |         2 |            0 |                          0 |
| `webpubsub/resource-manager/Microsoft.SignalRService/SignalRService`                        | `2025-12-01-preview` |         1 |            0 |                          0 |

**TypeSpec-only projects:** none. **Rule-level unassessed projects:** none in
the successful population; the six failed projects are separately excluded above.

### Reproducibility

- Specs checkout: `f6b53f105b95da05276530a0754a1c71b4f16397`.
- Dataset: the existing 468 ARM projects; no per-rule runner added.
- Representative selector: case-sensitive literal `ApiCenter.Management`,
  exactly one project, successful, 99 total diagnostics across all rules.
- Full command, run from `C:\dev\worktrees\lintdiff-post-response-codes`:

  ```powershell
  mise exec -- pnpm --dir packages/typespec-lintdiff specs:typespec --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-post-response-codes --concurrency 6
  ```

  This used the isolated pinned specs checkout with no filter or limit.

- Existing validator findings are retained; validator readme suppressions were
  not applied. TypeSpec uses declared service configurations plus the explicit
  local comparison ruleset.
- Raw TypeSpec lint output may include multiple declared API versions. No
  new production version filter is introduced to chase retained Swagger counts.
- The broad `no-response-body` diagnostic is kept as official coverage context,
  not included in the numerical mapping: that shared diagnostic also covers
  other verbs and cannot be attributed to POST from its code alone.

### Evidence limitation: retained diagnostic file attribution

An optional read-only shape extraction failed on a retained Network validator
record. It associates
`/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/networkWatchers/{networkWatcherName}/availableProvidersList`
with `applicationGateway.json`; that exact operation path is absent from the
associated file. The failed extraction was not retried, and no guessed file
correspondence or partial shape aggregate is used here. The retained diagnostic
and file metadata do not by themselves establish the underlying merge/reference
cause. This limits exact file-to-operation outlier attribution; it is not a
native rule defect or permission to discard that finding.

## Decision

**TypeSpec rule update required and implemented:** add only the synchronous
resource POST 200 missing-body check, supported native tests, and directly
related violating/compliant fixtures. Existing official checks remain reused.

The supported missing-body contract is tested directly. Complete functional
equivalence to the broader Swagger rule is not established: provider-action
population, legacy extension/initial-final representation, and unexplained
corpus attribution differences are not silently treated as intentional matches.
Corpus totals are observational evidence, not universal shape coverage.
