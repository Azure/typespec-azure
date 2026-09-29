# OperationIdNounConflictingModelNames migration

## Result and gap summary

The full 468-project ARM corpus at specs commit
`f6b53f105b95da05276530a0754a1c71b4f16397` has 462 assessable projects:
Swagger reports **487 diagnostics in 55 projects**. The rule now reports
**502 diagnostics in 56 assessable projects** (516 raw, including 14 from two
projects whose TypeSpec analysis failed); **54** projects overlap, **one**
is validator-only (FileShares), and **two** are TypeSpec-only
(ConfidentialLedger and ServiceFabricManagedClusters). These are
_project-level_, not necessarily matching-operation, counts. ApiManagement's
`Operation_ListByTags` is now detected through the supported
`@@clientLocation` metadata; `@clientName` on emitted models avoids eight
false positives for lowercased ResourceHealth definitions. Three earlier
service-namespace false-positive projects were also corrected. Across
assessable projects, per-project diagnostic deficits are 9 and surpluses 24.
ApiManagement's six earlier false positives for an ARM common model are
gone; its one remaining `Operation_ListByTags` warning agrees with Swagger.
Round 1's named-scalar correction adds the matching PostgreSQL
`PrivateDnsZoneSuffix_Get` warning and closes that project's prior one-warning
deficit. Round 2's HTTP-body reachability, direct-operation naming, and derived
model corrections leave the corpus totals unchanged while closing focused
supported-shape gaps and removing inline parameter/header false positives.
**This remains partial native coverage, not functional equivalence.**
Explicit `@operationId` and selected-version differences are documented
contract limits; other cardinality differences do not prove matching
operations.

## Native rule contract

### Required changes and decision

The current draft adds
`src/rules/operation-id-noun-conflicting-model-names.ts`, registers it in
`src/linter.ts`, and adds violating/compliant fixtures, snapshots and native
tests for authored and supported effective names. Round 1 review corrections
also cover the first operation-ID segment of underscored groups and reachable
named scalars, enums, and supported unions. Round 2 corrections restrict
definition reachability to HTTP request and response bodies, recognize
underscored effective names on direct or service-located operations, traverse
derived response models, and use schema-neutral diagnostics. The root service
namespace false positive and schema `@clientName` false positives were
corrected with native regressions. An ARM common-type false positive was
corrected using the exported `isArmCommonType` predicate. Explicit operation-ID
differences remain accepted source-contract limits; no emitter call or guessed
OpenAPI name belongs in this rule. Functional equality is **not** established.

Within each HTTP service, compare the effective AutoRest-scoped client location
or client name of an interface operation group (or a nested, non-service
namespace when it has no interface), using the segment before its first
underscore, with the effective client names of _reachable_ locally defined
models, scalars, enums, and unions directly declared in that service namespace.
ARM common types use external definitions and are not local name candidates
even if copied into the service namespace; their child types are still
traversed for local definitions.
For a direct service operation, or an operation explicitly relocated to the
service/global namespace, use the effective operation name only when it
contains the underscore required by the validator. Honor relevant
`@clientName` overrides on operations, interfaces, namespaces, and schema
types, while ignoring overrides scoped exclusively to other emitters.
Collect schema types reachable through single HTTP request and response bodies,
including nested properties, base and derived models, indexers, tuples and
union variants, with cycle-safe traversal. Do not treat query, path, request
header, response header, status-code, multipart, or file metadata as emitted
definitions. Report one warning per colliding HTTP operation, on that operation.
Do not report an unused type, a differently qualified nested type, or a type
from another service. The shared HTTP service API provides the operation
population; the compiler type graph and supported SDK naming metadata provide
schema identity and effective name. The sibling
`operation-id-noun-verb` rule instead inspects an emitted-style ID through
`@typespec/openapi`; that is unsuitable for this native rule.

The Swagger function
`@microsoft.azure/openapi-validator-rulesets/dist/spectral/functions/operation-id-noun-conflicting-model-names.js`
receives each `paths` or `x-ms-paths` operation ID, takes its case-sensitive
prefix before `_`, and checks whether the resolved Swagger document's
`definitions` has an exact matching key. It reports at the operation ID.
It does not check source reachability or whether the ID was authored using a
discouraged override. The native rule checks the authoring semantics, not a
reconstruction of generated names.

### Supported-shape and emission matrix

| Authored TypeSpec shape                                                               | Supported?                                | Native check / selected Swagger field                                                                                                         | Swagger result            | Native result                                        | Evidence                                                                                                                |
| ------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `Example.Widget` returned by `Operations.Widget.get`                                  | Yes; no OpenAPI override                  | HTTP operation group `Widget` and reachable model `Widget`; emitted `operationId: Widget_Get`, definition `Widget`                            | Warn                      | Warn on operation                                    | `noun-conflicts-model/main.tsp`, `output.json`, validator and TypeSpec snapshots                                        |
| `Widget` returned by `Widgets.get`                                                    | Yes                                       | Interface `Widgets` differs from reachable model `Widget`; emitted `operationId: Widgets_Get`, definition `Widget`                            | No warning                | No warning                                           | `noun-does-not-conflict/main.tsp` and snapshots                                                                         |
| `ApiContracts.listByTags` with `@@clientLocation(..., "Operation", "!javascript")`    | Yes                                       | AutoRest-scoped location is `Operation`, not authored interface `ApiContracts`; Swagger has `Operation_ListByTags` and definition `Operation` | Warn                      | Warn on operation                                    | ApiManagement selected Swagger, back-compatible.tsp, full corpus, and scoped native regression                          |
| `@@clientLocation(read, "Widget_Admin", "!javascript")` with schema `Widget`          | Yes                                       | Emitted `operationId: Widget_Admin_Read`; the validator compares the first segment `Widget`                                                   | Warn                      | Warn on operation                                    | Native regression plus AutoRest source and focused emission reproduction                                                |
| Direct `Widget_read` operation, including when relocated to the service namespace     | Yes                                       | Emitted operation ID retains the effective operation name; its first segment is `Widget`                                                      | Warn                      | Warn on operation                                    | Native regressions plus `resolveOperationId` source                                                                     |
| Named scalar, enum, or string-literal union `Widget` returned by group `Widget`       | Yes                                       | Each supported named type is referenced through an emitted `definitions.Widget` entry                                                         | Warn                      | Warn on operation                                    | Native regressions plus focused AutoRest emission reproduction                                                          |
| Scalar `Widget` used only as a query parameter or response header                     | Yes                                       | OpenAPI v2 parameter/header schemas are inline and do not add `definitions.Widget`                                                            | No warning                | No warning                                           | Native negative regressions plus `getSimpleParameterSchema`/`getResponseHeader` source                                  |
| `Widget extends Base` while group `Widget` returns `Base`                             | Yes                                       | Emitting `Base` schedules eligible derived model `Widget` as a definition                                                                     | Warn                      | Warn on operation                                    | Native regression plus AutoRest derived-model test and `getSchemaForModel` source                                       |
| Template declaration `Widget<T> extends Base` while group `Widget` returns `Base`     | Yes                                       | Template declarations are not concrete emitted definitions                                                                                    | No warning                | No warning                                           | Native negative regression plus `includeDerivedModel` source                                                            |
| Response property `@visibility(Lifecycle.Create) hidden: Hidden`                      | Yes                                       | AutoRest retains it with `x-ms-mutability: ["create"]` and emits `definitions.Hidden`, including when unreachable types are omitted           | Warn if group is `Hidden` | Warn on operation                                    | Focused AutoRest emission reproduction; visibility filtering would incorrectly drop an emitted definition               |
| `Widget` model with `@@clientName(Widget, "widget")` and group `Widget`               | Yes                                       | Effective model definition `widget` is distinct from operation group `Widget`                                                                 | No warning                | No warning                                           | ResourceHealth selected Swagger has lowercased `event`/`events` definitions; native model-override regression           |
| `PrivateEndpointConnection is PrivateEndpointConnectionResource` and a matching group | Yes                                       | ARM common-type model uses an external definition, not a local `PrivateEndpointConnection` definition                                         | No warning                | No warning                                           | ApiManagement selected Swagger, `isArmCommonType` and native real-inheritance regression                                |
| `Models.Widget` returned by interface `Widget`                                        | Yes                                       | Qualified definition `Models.Widget` is distinct from interface group `Widget`                                                                | No warning                | No warning                                           | Native unit test for nested model; emitter branch verified during fixture TDD                                           |
| Unreferenced model `Widget` and interface `Widget`                                    | Yes                                       | No reachable definition for `Widget`                                                                                                          | No warning                | No warning                                           | Native unit test for unused declaration                                                                                 |
| Direct `Example.read` operation and service model `Example`                           | Yes                                       | Service name is not a generated operation-group noun; the validator requires an underscored ID                                                | No warning                | No warning                                           | Native service-root regression; real `Microsoft.ConfidentialLedger.checkNameAvailability` emits `CheckNameAvailability` |
| Explicit `@operationId("FileShare_GetUsageData")` on another group                    | Discouraged by official `no-openapi` rule | Swagger selects explicit ID and may define `FileShare`; no allowed native OpenAPI operation-ID API is used                                    | May warn                  | Intentional parity gap; do not reconstruct overrides | FileShares selected corpus, authored `fileshares.tsp`, `packages/typespec-azure-core/src/rules/no-openapi.ts`           |

The effective model name comes from supported client naming metadata, not a parsed OpenAPI reference. This
contract does not promise identical counts for repeated emitted Swagger files,
unsupported emitter-only model transformations, older API versions, or explicit OpenAPI overrides.

## Coverage report reconciliation

| Report                                                                              | Scope                                                          | Validator projects |     TypeSpec projects |                           Overlap | Raw Swagger / TypeSpec diagnostics |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------- | -----------------: | --------------------: | --------------------------------: | ---------------------------------: |
| [`coverage_old.md`](../../../docs/coverage_old.md)                                  | Earlier external snapshot; 450 compiled projects, 210 rules    |                 53 | 0 locally; 0 official | Not available in aggregate report |                      Not available |
| [`coverage-breakdown.md`](../../../specs/coverage-breakdown.md) checked-in baseline | Production baseline before this rule was enabled               |                 55 |                     0 |                        0 projects |                            487 / 0 |
| Excluded local post-fix report                                                      | Full local run; generated corpus output intentionally excluded |                 55 |                    56 |                       54 projects |   487 / 502 on assessable projects |

The external gist copy in `coverage_old.md` supplies no generated-at timestamp
or generator revision; its checked-in content hash is
`6db4ed646b91d307af1aa6d856633c9d1080bf0abb4c1e26153de725f320c934`.
The corpus dataset was generated on `2026-08-06T08:03:27.940Z` by
`test/harness/spec-dataset.ts` at TypeSpec repository base
`deb8c8d4fbdd7d962e5b2ff4fd6e4b9c2cb3b168`; the final TypeSpec
analysis was generated on `2026-09-29T18:22:43.353Z` using the round 2 review
draft. The older gist's source project revision is not recorded
there; its denominator and rule count cannot be equated to this run.

The 53/55 difference reflects distinct report populations (450 versus 462
compiled projects), not a proven pair of newly affected services. The external
report has no project list; subtracting its aggregates cannot identify the
two projects. The baseline 487/0 gap reflected an absent implementation; the
first authored-name-only draft also reported 487/0 after fixing its root
service-namespace false positives. Its three initial TypeSpec-only projects
were caused by treating direct service operations as though the service name
were their operation group. The corrected full rerun removed those three.
Scoped client locations and model/client names are separately supported by
the current correction; their measured full-corpus population is reported
below rather than conflated with the older report.

## Reproduction commands

All commands below run from the repository root with the pinned specs checkout
at
`C:\dev\worktrees\azure-rest-api-specs-lintdiff-operation-id-noun-conflicting-model-names`.
The focused fixture command uses
`LINTDIFF_COMMON_TYPES=C:\dev\worktrees\azure-rest-api-specs-lintdiff-operation-id-noun-conflicting-model-names\specification\common-types`;
`LINTDIFF_VALIDATOR_ROOT=C:\dev\worktrees\azure-openapi-validator-lintdiff-shared`
selects validator source commit
`6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f`.

```powershell
mise exec -- pnpm -r --filter "tsp-lintdiff-local-linter..." build
mise exec -- pnpm --dir packages/typespec-lintdiff exec vitest run test/rules/operation-id-noun-conflicting-model-names.test.ts
$env:LINTDIFF_COMMON_TYPES="C:\dev\worktrees\azure-rest-api-specs-lintdiff-operation-id-noun-conflicting-model-names\specification\common-types"
$env:LINTDIFF_VALIDATOR_ROOT="C:\dev\worktrees\azure-openapi-validator-lintdiff-shared"
mise exec -- pnpm --dir packages/typespec-lintdiff validate --rule OperationIdNounConflictingModelNames
mise exec -- pnpm --dir packages/typespec-lintdiff test -- --run --reporter=dot
mise exec -- pnpm --dir packages/typespec-lintdiff specs:typespec --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-operation-id-noun-conflicting-model-names --filter Microsoft.ApiManagement --concurrency 6
mise exec -- pnpm --dir packages/typespec-lintdiff specs:typespec --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-operation-id-noun-conflicting-model-names --concurrency 6
mise exec -- pnpm --dir packages/typespec-lintdiff specs:coverage --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-operation-id-noun-conflicting-model-names
```

The final two commands regenerate the local `specs` reports and rule shards
used for the counts in this note. Those generated artifacts are validation
evidence and are restored to the checked-in baseline before publication.

## Fixture and native test evidence

The violation fixture uses an operation in `Operations.Widget` returning the
reachable service model `TestService.Widget`. The checked-in Swagger snapshot
contains `"operationId": "Widget_Get"` and the `"Widget"` definition; the
validator and native linter each report once. The plural `Widgets` fixture
is validator-clean and native-clean. Native tests exercise body-only
reachability, query/header exclusions, base and eligible derived models,
template-declaration exclusion, unused/nested/recursive models, direct
underscored operation names, scoped string/typed client locations, client names
on operations, groups, and schema types, and controls scoped only to another
emitter. Both fixture tests and all 32 focused native tests pass (all 494 tests
in the native rule suite also pass). The native suite covers direct service
operation non-conflict and conflict, including actual emitted Swagger noun
gaps. Other fixture diagnostics are explicitly reviewed ambient warnings, not
evidence of this rule's behavior.

## Systematic review of the original 55 validator-only projects

Before the metadata correction, **all 55** assessable validator-positive
projects were native-negative. An inventory of the actual copied TypeSpec
sources found `@clientLocation` in **53/55** projects, `@clientName` in
**54/55**, and `@operationId` in **21/55**. Searching each project's validator
message nouns for an exact literal in an authored `@clientLocation` found
**52/55** projects; the three exceptions demonstrate distinct authoring
patterns, not a common cause: StackHCIVM has an inline
`@Azure.ClientGenerator.Core.clientName("HybridIdentityMetadata")` on its
operation interface; DesktopVirtualization renames interface
`AppAttachPackages` to `AppAttachPackage` via `@@clientName`; FileShares
authors `@operationId("FileShareSnapshot_Get")` and other explicit IDs. These
project-level string scans are **only triage**: a file may have unrelated
decorators or versions; matching literals do not prove the particular
validator-reported operation or definition was emitted from them.

The effective naming APIs in `get-in-operation-name.ts` provide a supported
native path for scoped locations and client names, with a test for a location
typed as an interface and a control for a decorator scoped only to JavaScript.
The official `no-openapi` rule discourages explicit `@operationId`, and the
development contract prohibits adding an `@typespec/openapi` operation-ID
dependency to this production rule. FileShares remains a documented
validator-only shape rather than an invented metadata accessor or an
unproven claim of full parity. The final corpus comparison below determines
how much of the original 55-project population actually overlaps.

## Full-corpus comparison

The final run analyzed all 468 source projects; six failed TypeSpec analysis and
are excluded from _both_ sides of the observed overlap. The Swagger shard
contains 649 raw findings across 57 projects before filtering. The excluded
Network project contributes 161 findings and ServiceLinker contributes one:
649 - 162 = **487** assessable validator diagnostics in **55** projects.
The exact raw identity `(project, swagger file, JSON path)` has 487 distinct
values; removing the file from that identity still has 487. The TypeSpec
shard has **516 raw** findings in 58 projects, including 13 from excluded
Network and one from excluded ServiceLinker: **502 comparable** native
diagnostics at 502 distinct `(project, source file, line, column, message)`
identities in **56** projects. Project-level overlap is 54; FileShares is
the one validator-only project (eight warnings), while ConfidentialLedger
(eight) and ServiceFabricManagedClusters (two) are TypeSpec-only projects.
Adding positive project-count differences yields **9** validator surplus
diagnostics and adding negative differences yields **24** native surplus
diagnostics (net -15). These cardinality sums are not a line-by-line
operation match: ApiManagement previously had seven native diagnostics
for one Swagger warning; after excluding its six ARM common-model
warnings, only `Operation_ListByTags` remains and agrees with Swagger.
Of the original 55 validator-only projects, **54** now have
some native overlap; do not claim the other 54 have complete per-operation
coverage.
The six unsuccessful TypeSpec projects are:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network` (161 validator findings, 13 raw native findings excluded from comparison)
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker` (one validator finding and one raw native finding, both excluded)

The validator corpus retains the dataset's selected latest API version, whereas
ordinary TypeSpec diagnostics can include older API versions. For instance,
`ConfidentialLedger/ManagedCCF.tsp` removes `ManagedCCF` in
`v2026_02_23`, while the selected Swagger is `2026-05-22-preview` and
contains neither `ManagedCCF` definition nor matching operation ID. Its eight
native warnings may therefore belong to the older version, not a true
selected-version defect. The remaining native/validator differences cannot
be inferred solely from project-level totals.

### Gap example: emitted operation group differs from authored interface

- **Classification:** previously validator-only; now project-level overlap
- **Status:** covered by scoped client-location metadata
- **Project/API version:** `specification/apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement` / `2025-09-01-preview`
- **Source:** `typespec/ApiContract.tsp`, `typespec/models.tsp`

**TypeSpec source**

```text
@armResourceOperations
interface ApiContracts {
  @get
  @action("operationsByTags")
  @list
  listByTags is ApiContractOps.ActionSync<
    ApiContract,
    void,
    ArmResponse<TagResourceCollection>,
    Parameters = {
```

In `models.tsp`:

```typespec
model Operation {
  name?: string;
}
```

**Emitted OpenAPI or validator behavior**

```json
{
  "operationId": "Operation_ListByTags",
  "definitions": {
    "Operation": { "type": "object" }
  }
}
```

| Engine            | Observed result                                                                                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | One warning on `paths./subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ApiManagement/service/{serviceName}/apis/{apiId}/operationsByTags.get.operationId`: noun `Operation` matches a definition. |
| TypeSpec lint     | Warning: AutoRest-scoped `@@clientLocation(ApiContracts.listByTags, "Operation", "!javascript")` supplies the effective noun even though authored interface `ApiContracts` does not match model `Operation`.                            |

**Explanation:** `typespec/back-compatible.tsp:336` supplies a supported
client-location override for this operation. The native rule now resolves it
using TCGC metadata scoped to AutoRest, without invoking the emitter. The
other old one-sided projects do not thereby become equivalent by assumption.

**Disposition:** Covered at the project level; the project may still have
additional native warnings without matching definitions in its selected
Swagger. Continue distinguishing valid native overlap from false positives.

### Gap example: direct service name is not the operation noun

- **Classification:** TypeSpec-only in the first draft run, resolved in the final run
- **Status:** fixed
- **Project/API version:** `specification/confidentialledger/resource-manager/Microsoft.ConfidentialLedger/ConfidentialLedger` / `2026-05-22-preview`
- **Source:** `typespec/routes.tsp:17`, service model `ConfidentialLedger`

**TypeSpec source**

```typespec
namespace Microsoft.ConfidentialLedger;
@autoRoute
op checkNameAvailability is ArmProviderActionSync<
  Request = Azure.ResourceManager.CommonTypes.CheckNameAvailabilityRequest,
  Response = Azure.ResourceManager.CommonTypes.CheckNameAvailabilityResponse,
  Scope = SubscriptionActionScope,
  Parameters = {}
>;
```

**Emitted OpenAPI or validator behavior**

```json
{ "operationId": "CheckNameAvailability" }
```

| Engine            | Observed result                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Swagger validator | No warning: the emitted ID has no `_`.                                                                          |
| TypeSpec lint     | First draft warned about service name `ConfidentialLedger` versus model of the same name; final draft does not. |

**Explanation:** The service namespace identifies the service, not an
operation group for a directly declared operation. Two further initial
TypeSpec-only projects, ElasticSan and Peering, had the same direct-service
namespace predicate; that particular root-service false positive was removed,
although other TypeSpec-only projects have separate causes.

**Disposition:** Fixed by excluding direct service namespace fallback, with
the red/green native regression; no older-version explanation was needed.

### ARM common-type false positive and remaining non-equivalence

- **ARM common-type false positive, corrected:** ApiManagement's
  `typespec/PrivateEndpointConnection.tsp` declares
  `model PrivateEndpointConnection is PrivateEndpointConnectionResource`.
  Six previous native warnings used group `PrivateEndpointConnection`, but
  selected `2025-09-01-preview/openapi.json` references the externally
  supplied `common-types/.../privatelinks.json` instead of defining
  `PrivateEndpointConnection` locally. The supported ARM
  `isArmCommonType(model)` predicate is true for this model and false for
  ApiManagement's genuine local `Operation` model. The rule now excludes
  ARM common models from the local candidate set **without stopping graph
  traversal of their children**. Native regressions cover this exact
  inheritance pattern, a positive local `Operation`, and a local child
  reachable through a common model. The full-corpus rerun removes exactly
  these six ApiManagement warnings while retaining `Operation_ListByTags`.
  Comparing all native source identities to the archived pre-correction
  corpus finds **six removed and zero added diagnostics**.
- **Explicit operation IDs:** FileShares has eight validator-only warnings
  and uses `@operationId("FileShareSnapshot_Get")`,
  `@operationId("FileShare_GetUsageData")`, and related IDs in
  `typespec/fileshares.tsp`. Conversely, ServiceFabricManagedClusters has
  two native-only warnings for authored interfaces
  `ManagedAzResiliencyStatus` and `ManagedMaintenanceWindowStatus`;
  `typespec/ManagedCluster.tsp` explicitly uses lowercase
  `@operationId("managedAzResiliencyStatus_Get")` and
  `@operationId("managedMaintenanceWindowStatus_Get")`, and the selected
  Swagger has no IDs with the uppercase model-name prefixes. Accessing
  explicit OpenAPI operation-ID metadata through `@typespec/openapi` is
  disallowed for this new rule; the official `no-openapi` lint discourages
  these overrides, but the latter are suppressed for compatibility.
- **Selected-version mismatch:** ConfidentialLedger's eight native-only
  `ManagedCCF` warnings are on a model/interface marked
  `@removed(Versions.v2026_02_23)`; selected Swagger
  `2026-05-22-preview` has neither its definition nor operation IDs. The
  corpus runs the native lint across authored versions, not just the
  selected latest version.

Two overlapping projects had one more validator finding than native in the
earlier run. Named scalar support resolves PostgreSQL's
`PrivateDnsZoneSuffix` finding: the source returns the service-local scalar,
the selected Swagger has `operationId: PrivateDnsZoneSuffix_Get` and a
`PrivateDnsZoneSuffix` definition, and the final corpus adds exactly that one
native warning. SecuritySolutionsAPI retains one more validator finding than
native without a proven per-operation mapping; that deficit requires evidence
before calling it a source defect.
The explicit-ID differences are accepted contract limitations, not evidence
that project-level overlap proves full operation-level parity.

### Original validator-only project set

All 55 projects below had a validator finding and no native finding in the
previous authored-name-only analysis. In the final naming-metadata run, **54
overlap at the project level**; only FileShares remains validator-only. They
are **not** assumed to share the sampled ApiManagement cause:

- `specification/apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement`
- `specification/app/resource-manager/Microsoft.App/ContainerApps`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/ComponentLinkedStorageAccountApi`
- `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/AccessReview`
- `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/ProviderOperations`
- `specification/automation/Automation.Management`
- `specification/azure-kusto/resource-manager/Microsoft.Kusto/Kusto`
- `specification/azurelargeinstance/resource-manager/Microsoft.AzureLargeInstance/AzureLargeInstance`
- `specification/azurestackhci/resource-manager/Microsoft.AzureStackHCI/StackHCI`
- `specification/azurestackhci/resource-manager/Microsoft.AzureStackHCI/StackHCIVM`
- `specification/batch/resource-manager/Microsoft.Batch/Batch`
- `specification/billing/resource-manager/Microsoft.Billing/Billing`
- `specification/billingbenefits/resource-manager/Microsoft.BillingBenefits/BillingBenefits`
- `specification/cdn/resource-manager/Microsoft.Cdn/Cdn`
- `specification/cognitiveservices/CognitiveServices.Management`
- `specification/compute/resource-manager/Microsoft.Compute/Compute/Compute`
- `specification/compute/resource-manager/Microsoft.Compute/Compute/ComputeDisk`
- `specification/consumption/resource-manager/Microsoft.Consumption/Consumption`
- `specification/databoxedge/resource-manager/Microsoft.DataBoxEdge/DataBoxEdge`
- `specification/datafactory/resource-manager/Microsoft.DataFactory/DataFactory`
- `specification/desktopvirtualization/resource-manager/Microsoft.DesktopVirtualization/DesktopVirtualization`
- `specification/developerhub/resource-manager/Microsoft.DevHub/DeveloperHub`
- `specification/dns/resource-manager/Microsoft.Network/Dns`
- `specification/domainservices/resource-manager/Microsoft.AAD/DomainServices`
- `specification/eventhub/resource-manager/Microsoft.EventHub/Eventhub`
- `specification/fileshares/resource-manager/Microsoft.FileShares/FileShares`
- `specification/hardwaresecuritymodules/resource-manager/Microsoft.HardwareSecurityModules/HardwareSecurityModules`
- `specification/hybridcompute/resource-manager/Microsoft.HybridCompute/HybridCompute`
- `specification/hybridkubernetes/resource-manager/Microsoft.Kubernetes/HybridKubernetes`
- `specification/iothub/resource-manager/Microsoft.Devices/IoTHub`
- `specification/machinelearningservices/MachineLearningServices.Management`
- `specification/management/resource-manager/Microsoft.Management/ManagementGroups`
- `specification/marketplace/resource-manager/Microsoft.Marketplace/Marketplace`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/DiagnosticsSettings`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/ServiceDiagnosticsSettingsApi`
- `specification/operationalinsights/resource-manager/Microsoft.OperationalInsights/OperationalInsights`
- `specification/policyinsights/resource-manager/Microsoft.PolicyInsights/PolicyInsights/PolicyInsightsApi`
- `specification/postgresql/DBforPostgreSQL.Management`
- `specification/recoveryservices/resource-manager/Microsoft.RecoveryServices/RecoveryServices`
- `specification/recoveryservicesbackup/resource-manager/Microsoft.RecoveryServices/RecoveryServicesBackup`
- `specification/recoveryservicessiterecovery/resource-manager/Microsoft.RecoveryServices/SiteRecovery`
- `specification/redhatopenshift/resource-manager/Microsoft.RedHatOpenShift/OpenShiftClusters`
- `specification/redisenterprise/resource-manager/Microsoft.Cache/RedisEnterprise`
- `specification/resources/resource-manager/Microsoft.Resources/resources`
- `specification/security/resource-manager/Microsoft.Security/Security/ApplicationsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/SecuritySolutionsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/SqlVulnerabilityAssessmentsAPI`
- `specification/securityinsights/resource-manager/Microsoft.SecurityInsights/SecurityInsights`
- `specification/servicebus/resource-manager/Microsoft.ServiceBus/ServiceBus`
- `specification/sql/resource-manager/Microsoft.Sql/SQL`
- `specification/storage/Storage.Management`
- `specification/storageactions/resource-manager/Microsoft.StorageActions/StorageActions`
- `specification/storagecache/resource-manager/Microsoft.StorageCache/StorageCache`
- `specification/storagesync/resource-manager/Microsoft.StorageSync/StorageSync`
- `specification/web/resource-manager/Microsoft.Web/AppService`

**Final TypeSpec-only projects:** ConfidentialLedger (eight warnings on an
older removed resource) and ServiceFabricManagedClusters (two warnings where
explicit lowercase `@operationId` overrides the inferred group).
**Same-project overlap:** 54; not proof of individual operation equivalence.
The rule fixes valid authored shapes demonstrated by the fixture, focused
native regressions, and ApiManagement. The remaining evidence-backed contract
gap is explicit `@operationId`, which the official `no-openapi` rule discourages
and this native implementation intentionally does not reconstruct. Corpus
cardinality differences also remain only project-level evidence, so functional
equality is not established. Do not represent this migration as fully
equivalent.
