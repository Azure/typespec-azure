# PutInOperationName migration

## Result and gap summary

The full production comparison found **133 Swagger diagnostics and 143 native
diagnostics in the same 52 projects**, with **no validator-only or native-only
projects**, among 462 successfully compiled projects out of 468. The ten native
extras are explained: **eight SDK-renamed operations** have compliant emitted
IDs but non-`create` source names; **two AppService operations** use explicit IDs
without underscores, which the validator skips. All ten exist in the selected
latest Swagger versions; none is an older-version population mismatch.

The rule update removed **43 false positives**: 39 internal template-instance
findings and four non-service SDK-helper findings. It now checks concrete ARM
HTTP endpoints and avoids conflicting with data-plane naming guidance.
The native ARM contract is covered; exact Swagger equivalence remains
**partial**, intentionally excluding emitter-specific naming and historical
name reconstruction. Six unchanged compile failures, including Network's 44
validator findings, remain outside the assessed population. There is no
unexplained count remainder in the successful-project comparison.

## Decision and official coverage

**TypeSpec rule update required and implemented.** The previous operation
visitor reported instantiated generic operations such as
`ArmResourceCreateOrReplaceSync`, even when the concrete emitted operation was
named `createOrUpdate`. It also diagnosed data-plane `replace` operations that
the official data-plane naming rule permits. The replacement uses
`getAllHttpServices` and visits each concrete PUT endpoint in an ARM service.
The authored name must start with `create`, case-insensitively.

Official coverage is **partial**, with this change limited to the ARM gap:

- Azure Core's registered `use-standard-names` checks names according to HTTP
  response codes; 200-only PUT can start with `replace`. The data-plane ruleset
  enables it, while the resource-manager ruleset explicitly disables it.
- ARM's registered `arm-resource-operation` checks operation placement,
  API-version parameters, and lifecycle decorators, not naming.
- `ArmResourceCreateOrReplaceAsync` inherits `armResourceCreateOrUpdate`, whose
  `setResourceLifecycleOperation` records `target.name` without renaming it.
  `set is ArmResourceCreateOrReplaceAsync<Widget>` is therefore authorable
  without bypassing standard templates.
- The official ARM rule documentation and linter registration provide the
  maintained inventory. The RPC coverage page's RPC009 template enforcement
  concerns PUT/PATCH semantics, not SDK guideline M1006 naming.

The ARM service predicate is temporary lintdiff isolation, not the naming
contract. Promotion into ARM should remove that predicate and rely on the ARM
ruleset. No provider decorator should be required on individual nested
namespaces. No data-plane rule or official library was changed.

## Source and comparison populations

The TypeSpec source-of-truth target was fetched as
`origin/feature/lintdiff-migration-new` at
`af74f257b8edf9455fbec1748f22706c0d14284c`.
The dedicated rule branch initially equaled that remote target. Exact head/base
and title searches found no existing merged migration PR.

The isolated specs checkout is pinned to
`f6b53f105b95da05276530a0754a1c71b4f16397`.
The retained Swagger dataset was generated on 2026-08-06 at 08:03:27 UTC by
`test/harness/spec-dataset.ts`: 468 projects, 625 emitted Swagger files, no
dataset-generation failures, and the selected latest API version per project.
Readme suppressions are recorded in `_meta.json`; the retained findings are
not a fresh validator run. The current native runner checks the source program,
not a selected-version projection for this naming rule. Compiler failures are
excluded from both sides of the behavioral comparison, not counted as compliant.
Lint suppressions remain effective.

Validator research uses checkout
`a970d991d2785184d2786b85e0a345dc3f37bc25`; direct code and documentation links
are in [rule.md](./rule.md). The resolved Spectral selector visits
`paths`/`x-ms-paths` PUT `operationId` properties. It ignores empty/non-string
IDs and IDs without underscores. Otherwise either `^(\w+)_(Create)` or
`^(Create)` must match. Each selected property produces at most one diagnostic.
Neither response codes nor LRO status affect the check.

## Coverage report reconciliation

Both required reports were read before implementation:

| Report                                                                           | Population                                      | Validator projects |           Native projects | Official credit |     Overlap | Validator-only / native-only | Raw validator / native |
| -------------------------------------------------------------------------------- | ----------------------------------------------- | -----------------: | ------------------------: | --------------: | ----------: | ---------------------------- | ---------------------- |
| [External aggregate snapshot](../../../docs/coverage_old.md)                     | 450 compiled projects, 210 rules                |                 50 | 50 credited by local lint |               0 | 50 credited | Not individually recoverable | Not reported           |
| [Checked-in observed report](../../../specs/coverage-breakdown.md), before rerun | 462 successful / 468 processed, 215 known rules |                 52 |                        55 |               0 |          52 | 0 / 3                        | 133 / 186              |

The external snapshot was added in commit `6a418911d`; it links to a gist but
does not pin the original specs commit, generation date, or generator revision.
Its aggregate row cannot identify missing projects. The observed report's
source metadata dates to 2026-08-10 at 09:38:18 UTC; its pinned specs revision
is given above. Both rows classify this rule as production/local lint, not a
staging-only or official-rule credit. The different 450-versus-462 successful
project populations prevent attributing the extra two affected projects to a
semantic change.

The retained unfiltered shards contain 177 validator findings in 53 projects
and 199 old native findings in 56 projects. These are not the successful-project
row's 133/186 totals: failed-project findings must first be excluded. In
particular, the old failed Network project contributes 44 validator findings.
The new fixture mapping is explicitly `partial` because it documents native
boundaries rather than claiming every emitted-ID quirk is reproduced.

## Final full-corpus evidence

The representative Advisor run completed before the full run. The full command
used the existing runner with `--concurrency 6` over all 468 projects and
completed with exit code 0 at **2026-09-11 12:21:44 +08:00**. Recorded duration:
1,363,345 ms (22 minutes 43 seconds). The index's `generatedAt` is
`2026-09-11T04:19:12.069Z`; this field is not the final process-completion time.

| Scope                                                                          | Validator diagnostics / projects | Native diagnostics / projects |  Overlap | Validator-only | Native-only |
| ------------------------------------------------------------------------------ | -------------------------------- | ----------------------------- | -------: | -------------: | ----------: |
| All retained findings, including failed projects (not behaviorally comparable) | 177 / 53                         | 156 / 53                      | Not used |       Not used |    Not used |
| 462 successfully compiled projects                                             | 133 / 52                         | 143 / 52                      |       52 |              0 |           0 |

Complete validator-only list: **empty**. Complete native-only list: **empty**.
The former native-only projects ApiCenter, ComputeGallery, and ManagementGroups
are eliminated by endpoint traversal, not by version filtering. ApiCenter and
ComputeGallery's diagnosed generics were never endpoints in any version;
ManagementGroups' diagnosed helper was outside its service namespace.

### Selected-version attribution and count identities

Swagger uses each project's dataset-selected latest version. The native runner
does not project this rule. The ten additional native targets were individually
matched to their retained selected-version Swagger operations using source
decorators and emitted IDs (see the examples below); all are present.
No older-version-only diagnostic was identified or excluded in explaining the
observed gap. The compared native population remains 143, rather than silently
reducing it to 133. This is corpus attribution, not a claim that the production
rule reconstructs all historical names.

| Identity                                     | Count |
| -------------------------------------------- | ----: |
| Validator raw                                |   133 |
| Validator project + Swagger file + JSON path |   133 |
| Validator project + JSON path                |   133 |
| Native raw                                   |   143 |
| Native project + source file + line + column |   143 |

There are 49 affected projects with equal deduplicated counts, zero
validator-higher projects, and three native-higher projects. The sum of
validator-higher differences is zero; the sum of native-higher differences is
ten. No deduplication reduces either total, so emitted multiplicity does not
explain the remaining gap.

| Project / selected API version       | Swagger | Native | Cause of extra native findings                  |
| ------------------------------------ | ------: | -----: | ----------------------------------------------- |
| ApiManagement / `2025-09-01-preview` |       3 |     10 | Seven authored names changed with `@clientName` |
| SQL / `2025-02-01-preview`           |       1 |      2 | One authored name changed with `@clientName`    |
| AppService / `2026-07-15`            |      41 |     43 | Two explicit ungrouped IDs skipped by Swagger   |

The old successful-project native total was 186. Of the 43 removed findings,
39 were generic instances: ApiCenter 8, Compute 17, ComputeDisk 5, and
ComputeGallery 9. Four were non-service SDK helpers: ManagementGroups 1 and
Search 3. The ten explained emitter-boundary differences remain unchanged.
No additional production special cases are required to make the raw totals
equal.

### Complete same-project overlap

All 52 affected projects are ARM projects:

```text
specification/advisor/resource-manager/Microsoft.Advisor/Advisor
specification/apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement
specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/AnalyticsItems
specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/ComponentAPIs
specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/Favorites
specification/authorization/resource-manager/Microsoft.Authorization/Authorization/AccessReview
specification/automation/Automation.Management
specification/azurearcdata/resource-manager/Microsoft.AzureArcData/AzureArcData
specification/azurestackhci/resource-manager/Microsoft.AzureStackHCI/StackHCI
specification/billing/resource-manager/Microsoft.Billing/Billing
specification/cognitiveservices/CognitiveServices.Management
specification/compute/resource-manager/Microsoft.Compute/Compute/Compute
specification/compute/resource-manager/Microsoft.Compute/Compute/ComputeDisk
specification/containerservice/resource-manager/Microsoft.ContainerService/aks
specification/cosmos-db/resource-manager/Microsoft.DocumentDB/DocumentDB
specification/dashboard/resource-manager/Microsoft.Dashboard/Dashboard
specification/databoxedge/resource-manager/Microsoft.DataBoxEdge/DataBoxEdge
specification/dataprotection/resource-manager/Microsoft.DataProtection/DataProtection
specification/desktopvirtualization/resource-manager/Microsoft.DesktopVirtualization/DesktopVirtualization
specification/domainregistration/resource-manager/Microsoft.DomainRegistration/DomainRegistration
specification/eventgrid/resource-manager/Microsoft.EventGrid/EventGrid
specification/hdinsight/resource-manager/Microsoft.HDInsight/HDInsight
specification/hybridcompute/resource-manager/Microsoft.HybridCompute/HybridCompute
specification/iothub/resource-manager/Microsoft.Devices/IoTHub
specification/keyvault/resource-manager/Microsoft.KeyVault/KeyVault
specification/machinelearningservices/MachineLearningServices.Management
specification/marketplace/resource-manager/Microsoft.Marketplace/Marketplace
specification/migrate/resource-manager/Microsoft.Migrate/AssessmentProjects
specification/mysql/resource-manager/Microsoft.DBforMySQL/FlexibleServers
specification/notificationhubs/resource-manager/Microsoft.NotificationHubs/NotificationHubs
specification/onlineexperimentation/OnlineExperimentation.Management
specification/operationalinsights/resource-manager/Microsoft.OperationalInsights/OperationalInsights
specification/postgresql/DBforPostgreSQL.Management
specification/postgresqlhsc/resource-manager/Microsoft.DBforPostgreSQL/PostgresqlHsc
specification/recoveryservicesbackup/resource-manager/Microsoft.RecoveryServices/RecoveryServicesBackup
specification/recoveryservicesdatareplication/resource-manager/Microsoft.DataReplication/DataReplication
specification/redis/resource-manager/Microsoft.Cache/Redis
specification/redisenterprise/resource-manager/Microsoft.Cache/RedisEnterprise
specification/reservations/resource-manager/Microsoft.Capacity/Reservations/Reservations
specification/resources/resource-manager/Microsoft.Resources/databoundaries
specification/search/resource-manager/Microsoft.Search/Search
specification/security/resource-manager/Microsoft.Security/Security/AlertsSuppressionRulesAPI
specification/security/resource-manager/Microsoft.Security/Security/ApiCollectionsAPI
specification/security/resource-manager/Microsoft.Security/Security/PricingsAPI
specification/security/resource-manager/Microsoft.Security/Security/SettingsAPI
specification/securityinsights/resource-manager/Microsoft.SecurityInsights/SecurityInsights
specification/signalr/resource-manager/Microsoft.SignalRService/SignalRService
specification/sql/resource-manager/Microsoft.Sql/SQL
specification/storage/Storage.Management
specification/subscription/resource-manager/Microsoft.Subscription/Subscription
specification/web/resource-manager/Microsoft.Web/AppService
specification/webpubsub/resource-manager/Microsoft.SignalRService/SignalRService
```

### Compile failures and exclusions

These are the same six failed projects as the checked-in baseline. Errors were
read from each project's `raw/typespec.stdout.txt`; they are compiler/HTTP
errors, not naming-rule errors.

| Failed project                                                                                           | Representative error                                                                      |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices` | `@typespec/http/duplicate-body`, `client.tsp:469`                                         |
| `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`                  | `@typespec/http/missing-uri-param` (`subscriptionId`, `resourceGroupName`, `serviceName`) |
| `specification/network/resource-manager/Microsoft.Network/Network/Network`                               | `@typespec/http/missing-uri-param` (`applicationGatewayAvailableSslOption`)               |
| `specification/quota/resource-manager/Microsoft.Quota/Quota`                                             | `@typespec/http/missing-uri-param` (`subscriptionId`, `resourceGroupName`)                |
| `specification/resources/resource-manager/Microsoft.Resources/deployments`                               | `@typespec/http/duplicate-body` in a legacy operation template                            |
| `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`                     | `@typespec/http/duplicate-body`, `client.tsp:195`                                         |

Network contributes all 44 excluded validator findings and 13 excluded native
findings for this rule. No conclusion is made about rule equivalence in that
failed project or the other five failed projects. The final index, rule shard,
coverage JSON, failure logs, and deterministic count extraction are preserved
as session artifacts; generated corpus files are excluded from the PR.

## Native shape and emission matrix

Operation naming is independent of request/response payload type, media type,
and HTTP status. The meaningful shape families are concrete namespace and
interface operations, operation aliases, inherited interfaces, generic
declarations/instantiations, and versioned operation names. Payload schema
formatting is not simulated.

`put-in-operation-name.test.ts` is the native suite; it mocks AutoRest and TCGC
to throw if loaded. `put-in-operation-name-emission.test.ts` is explicitly
comparison research, which may load the emitter and upstream validator.
The latter derives standard ARM operations from the compliant fixture, verifies
emitted IDs, and invokes the installed validator function. The template fixture
pair has no official ARM/core diagnostics; its reviewed ambient diagnostics
are one older-common-types warning and six missing-example warnings from
unrelated temporary lints.

| Authored shape                                                  | Validity/support                                                    | Native check / emitter branch                                       | Selected field present and value                                | Swagger                           | Native                                                    | Evidence                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `Widgets.set is ArmResourceCreateOrReplaceAsync<Widget>`        | Supported standard ARM alias                                        | Concrete endpoint name; `resolveOperationId` interface branch       | Yes: `Widgets_Set`                                              | Warn                              | Warn once on `set`                                        | `template-name-violation`; native ARM-alias test; emission ordinary-alias row |
| Same alias named `createOrUpdate`                               | Supported standard ARM alias                                        | Same branch                                                         | Yes: `Widgets_CreateOrUpdate`                                   | Pass                              | Pass                                                      | `template-name-compliance`; emission create-alias row                         |
| `CreateWidgets.set` using the same template                     | Supported operation, nonstandard method name                        | Native name is still `set`; emitter uses interface name             | Yes: `CreateWidgets_Set`                                        | Pass: group satisfies `^(Create)` | Warn                                                      | Emission group-prefix row; native interface-name test                         |
| `Widgets.set_Create` using the same template                    | Compiles; violates official `casing-style`                          | Native prefix is `set`; `standardizeOperationId` splits underscores | Yes: `Widgets_Set_Create`                                       | Pass: greedy noun regex           | Warn; no regex adapter                                    | Emission underscore row; native underscore test                               |
| `createOrUpdate` with explicit `@operationId("Widgets_Set")`    | Compiles, but prohibited by official `no-openapi`                   | Native name unchanged; emitter explicit-ID branch                   | Yes: `Widgets_Set`                                              | Warn                              | Pass; override intentionally outside native contract      | Emission explicit-override row; official `no-openapi` implementation          |
| `set` with `@clientName("create")`                              | Supported SDK customization, not a native name change               | Native `set`; emitter `getClientName`                               | Yes: `Widgets_Create`                                           | Pass                              | Warn; no TCGC dependency                                  | Emission SDK-rename row; native `set` test                                    |
| Generic `PutTemplate<T>` and its internal instantiation         | Valid building blocks, not standalone endpoints                     | Excluded by HTTP endpoint enumeration                               | No standalone operation field                                   | No standalone finding             | Pass                                                      | Native generic/alias tests; ApiCenter corpus example below                    |
| Concrete alias of generic template named `replace`              | Supported HTTP endpoint; ARM naming violation                       | Concrete endpoint included                                          | Group/name determines ID; no-underscore IDs are exempt upstream | Warn when grouped                 | Warn once                                                 | Native concrete-alias test and validator exemption tests                      |
| Inherited interface endpoint `set`                              | Supported HTTP endpoint                                             | Concrete inherited operation included, internal template excluded   | Interface-prefixed ID                                           | Warn for ordinary group           | Warn once                                                 | Native inherited-interface test                                               |
| Nested ARM namespace/interface operation                        | Supported HTTP endpoint                                             | Service traversal includes descendants                              | Namespace/interface-prefixed ID                                 | Warn for ordinary group           | Warn                                                      | Native nested-namespace test                                                  |
| Root service operation `set`                                    | Valid HTTP, but official ARM rule requires interface placement      | Name checked without formatting; emitter root/service branch        | Yes: `Set`, no underscore                                       | Pass                              | Warn; no underscore exemption                             | Native namespace test; upstream exemption tests; emitter `resolveOperationId` |
| Data-plane `replace` with 200 response                          | Supported data-plane guidance                                       | Lintdiff ARM isolation excludes service                             | Potentially `Group_Replace`                                     | Warn if grouped                   | No local warning; official rule owns data-plane semantics | Native service-isolation test; official `use-standard-names` tests            |
| Non-PUT endpoint                                                | Supported                                                           | Verb gate                                                           | Not selected by this validator                                  | Pass                              | Pass                                                      | Native GET control                                                            |
| Source `set` removed in a later version                         | Valid versioned source                                              | Source endpoint retained; emission projection removes it later      | Present only in older output                                    | Older-version warning only        | Source warning retained                                   | Native removed-operation test; selected-version attribution below             |
| Current `createOrUpdate`, historically `set` via `@renamedFrom` | Supported versioning                                                | Current name only; emitter version snapshot restores old name       | Old: `Widgets_Set`; current: `Widgets_CreateOrUpdate`           | Warn only in old output           | Current-name pass; historical names not reconstructed     | Native historical-name test; two-version emission test                        |
| Missing/non-string/empty Swagger ID                             | Swagger-only or invalid decorator argument; not a valid native name | No native equivalent                                                | Missing/invalid/empty                                           | Pass                              | Not applicable                                            | Upstream function/exemption tests                                             |

Current native operation names are checked case-insensitively. `create`,
`createOrUpdate`, `createOrReplace`, `createWidget`, and `CreateWidget` pass;
`set`, `put`, `recreate`, and `replace` fail. Official casing rules independently
constrain spelling. No special case was added for schema types, SDK scope,
OpenAPI overrides, or historical-name reconstruction.

## Gap example: template instantiations are not endpoints

- **Classification:** TypeSpec-only and count-only.
- **Status:** Fixed.
- **Project/API version:** `specification/apicenter/ApiCenter.Management` /
  `2024-06-01-preview`.
- **Source:** `main.tsp:191`, generic `ArmResourceCreateOrReplaceSync`.

**TypeSpec source**

```typespec
@armResourceCreateOrUpdate(TResource)
@put
op ArmResourceCreateOrReplaceSync<
  TResource extends Foundations.Resource,
  TBaseParameters = BaseParameters<TResource>
>(
  ...ResourceInstanceParameters<TResource, TBaseParameters>,
  @doc("Resource create parameters.") @bodyRoot resource: TResource,
):
  | ArmResourceUpdatedResponseWithEtag<TResource>
  | ArmResourceCreatedSyncResponseWithEtag<TResource>
  | ErrorResponse;
```

The retained old native shard reports this generic name eight times at the
same location. It is not an emitted operation ID. The same cause appears nine
times at `Compute/common/operations.tsp:24` in the ComputeGallery project,
where `ComputeResourceCreateOrReplaceAsync` is an intermediate generic template.
This is not a version difference: there is no standalone Swagger operation
corresponding to the template in any version.

| Engine                | Result                                                                    |
| --------------------- | ------------------------------------------------------------------------- |
| Swagger validator     | No finding on the template; only concrete emitted operations are selected |
| Previous native rule  | Warned on generic instantiations, creating duplicate source findings      |
| Corrected native rule | Checks concrete HTTP endpoints, not those template instances              |

**Disposition:** Fixed endpoint traversal. Native tests reproduce both the
false positive and the requirement to retain concrete aliases/inherited
interface operations. Corpus overlap alone was not used to justify the fix.

## Gap example: a real ARM alias naming violation

- **Classification:** Same-project positive control.
- **Status:** Preserved.
- **Project/API version:** `specification/advisor/resource-manager/Microsoft.Advisor/Advisor`
  / `2026-03-01-preview`.
- **Source:** `AssessmentResult.tsp:36`, `AssessmentResults.put`.

**TypeSpec source**

```typespec
put is ArmResourceCreateOrReplaceSync<
  AssessmentResult,
  BaseParameters = Azure.ResourceManager.Foundations.SubscriptionBaseParameters
>;
```

**Retained Swagger validator behavior**

```json
{
  "operationId": "Assessments_Put",
  "path": "/subscriptions/{subscriptionId}/providers/Microsoft.Advisor/assessments/{assessmentName}"
}
```

The source alias is `put`, and the retained validator diagnostic names
`Assessments_Put` at the PUT `operationId` field. Both engines reject the method
name despite the different operation-group spelling. The one-project sample
completed successfully before the full run.

**Disposition:** Preserve the warning; do not treat standard-template use as
proof that the authored name is compliant.

## Gap example: client helpers outside the service are not API endpoints

- **Classification:** TypeSpec-only/count-only in the old implementation.
- **Status:** Fixed.
- **Project/API version:** `specification/management/resource-manager/Microsoft.Management/ManagementGroups`
  / `2023-04-01`.
- **Source:** `back-compatible.tsp:163`, global `putSubscriptionCustomized`.

**TypeSpec source**

```typespec
using Microsoft.Management;
@@override(SubscriptionUnderManagementGroups.create, putSubscriptionCustomized);
@put
op putSubscriptionCustomized is Azure.ResourceManager.Legacy.CreateOperation<...>;
```

The ellipsis omits the lengthy parameter/response arguments; the verified
declaration and override are in the pinned source. `using Microsoft.Management`
does not place this operation in that namespace. The service is
`Microsoft.Management` (`main.tsp:39`); this helper is global.

**Retained emitted OpenAPI**

```json
{ "operationId": "ManagementGroupSubscriptions_Create" }
```

| Engine                | Result                                                                     |
| --------------------- | -------------------------------------------------------------------------- |
| Swagger validator     | Passes the actual service operation's `Create` ID                          |
| Previous native rule  | Warned on the global SDK helper                                            |
| Corrected native rule | Ignores the helper outside the service, checks the actual service endpoint |

**Explanation:** This is service reachability, not API-version projection or a
TCGC-specific exemption. Search has the same cause for three client-only PUT
helpers in `client.tsp`'s separate `Customizations` namespace. Native tests
prove that non-service declarations are excluded without importing TCGC.

**Disposition:** Fixed by HTTP service traversal. SDK helpers authored inside
the service are not universally excluded; no SDK-scope equivalence is claimed.

## Gap example: SDK names differ from authored operation names

- **Classification:** Count-only.
- **Status:** Intentional native-contract difference.
- **Project/API version:** ApiManagement / `2025-09-01-preview`; SQL /
  `2025-02-01-preview`.
- **Source:** ApiManagement `back-compatible.tsp:477-478`; SQL
  `back-compatible.tsp:444-451`.

**TypeSpec source**

```typespec
@@clientLocation(ProductContracts.productApiCreateOrUpdate, "ProductApi");
@@clientName(ProductContracts.productApiCreateOrUpdate, "CreateOrUpdate");
```

**Retained emitted OpenAPI**

```json
{ "operationId": "ProductApi_CreateOrUpdate" }
```

| Engine            | Result                                                  |
| ----------------- | ------------------------------------------------------- |
| Swagger validator | Passes the renamed `CreateOrUpdate` ID                  |
| Native lint       | Warns on the authored `productApiCreateOrUpdate` prefix |

The same verified source decorators and retained Swagger IDs explain these
eight operation differences:

| Project       | Authored operation                                  | Emitted ID                                           |
| ------------- | --------------------------------------------------- | ---------------------------------------------------- |
| ApiManagement | `gatewayApiCreateOrUpdate`                          | `GatewayApi_CreateOrUpdate`                          |
| ApiManagement | `productApiCreateOrUpdate`                          | `ProductApi_CreateOrUpdate`                          |
| ApiManagement | `productGroupCreateOrUpdate`                        | `ProductGroup_CreateOrUpdate`                        |
| ApiManagement | `notificationRecipientEmailCreateOrUpdate`          | `NotificationRecipientEmail_CreateOrUpdate`          |
| ApiManagement | `notificationRecipientUserCreateOrUpdate`           | `NotificationRecipientUser_CreateOrUpdate`           |
| ApiManagement | `workspaceNotificationRecipientEmailCreateOrUpdate` | `WorkspaceNotificationRecipientEmail_CreateOrUpdate` |
| ApiManagement | `workspaceNotificationRecipientUserCreateOrUpdate`  | `WorkspaceNotificationRecipientUser_CreateOrUpdate`  |
| SQL           | `dataMaskingRulesCreateOrUpdate`                    | `DataMaskingRules_CreateOrUpdate`                    |

**Explanation:** AutoRest's `resolveOperationId` reads SDK names and locations.
Those decorators do not rename the TypeSpec semantic operation. The selected
Swagger contains each operation, so these are not findings on older-only
versions.

**Disposition:** Preserve authored-name validation, record partial Swagger
coverage, and do not import TCGC into ARM. The isolated emission SDK-rename test
proves this difference on a standard ARM template independently of corpus data.

## Gap example: ungrouped explicit IDs bypass the validator

- **Classification:** Count-only.
- **Status:** Intentional difference on already-discouraged authoring.
- **Project/API version:** `specification/web/resource-manager/Microsoft.Web/AppService`
  / `2026-07-15`.
- **Source:** `User.tsp:54-55` and `SourceControl.tsp:54-55`.

**TypeSpec source**

```typespec
@operationId("UpdatePublishingUser")
updatePublishingUser is ArmResourceCreateOrReplaceSync<
  User,
  BaseParameters = Azure.ResourceManager.Foundations.TenantBaseParameters,
  Response = ArmResourceUpdatedResponse<User>,
  Error = DefaultErrorResponse
>;
```

**Retained emitted OpenAPI**

```json
{
  "/providers/Microsoft.Web/publishingUsers/web": {
    "put": { "operationId": "UpdatePublishingUser" }
  },
  "/providers/Microsoft.Web/sourcecontrols/{sourceControlType}": {
    "put": { "operationId": "UpdateSourceControl" }
  }
}
```

| Engine            | Result                                                    |
| ----------------- | --------------------------------------------------------- |
| Swagger validator | Skips both IDs because neither contains an underscore     |
| Native lint       | Warns on `updatePublishingUser` and `updateSourceControl` |

**Explanation:** Both source operations and retained paths exist in the selected
latest API version. The files explicitly suppress `no-openapi` and
`arm-put-operation-response-codes`; they are not clean supported ARM examples
that justify emitter-specific production logic.

**Disposition:** Do not copy the underscore exemption or consume explicit IDs.
The native warning is correct for the authored method name; Swagger coverage
remains partial. Separate emission research verifies this bypass without using
OpenAPI metadata in production.

## Validation and limitations

All **31 tests** pass: 17 native tests and 14 emission/validator-boundary tests.
The native suite covers supported template aliases, generic exclusions,
inherited endpoints, nested namespaces, service isolation, non-PUT methods,
prefix boundaries, and source-version behavior without an emitter. Separate
emission research covers ordinary names, grouping/underscore quirks, explicit
IDs, SDK naming, validator missing/ungrouped exemptions, and historical names.
The three snapshot fixtures are two violation cases and one compliant control
with explicitly reviewed ambient diagnostics.

The repository's `audit:noise` command has no rule selector and recompiles every
violation fixture. It was not run as a repository-wide proxy: the focused
validator output and per-fixture `tsp-diagnostics.json` provided the exact
ambient diagnostic review instead.

Chronus was invoked for this private package and returned "No package changed";
the rule description and this migration note record the change. No dependency
repair was required. Generated corpus data is validation evidence only and is
not included in the rule PR.

Exact executable Swagger equivalence is not claimed. The material ARM naming
contract is a native authored-name check; SDK/emitter overrides, invalid
OpenAPI authoring, and historical name formatting remain outside it. Corpus
comparison proves only the selected projects and versions, not universal
coverage of every emitted ID.
