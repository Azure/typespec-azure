# DeleteInOperationName migration

## Result and gap summary

The full run processed all 468 projects: 462 compiled successfully and the same
six projects as the retained baseline failed. The refreshed comparison has 25
Swagger diagnostics in nine projects versus 40 native diagnostics in 15;
all nine Swagger projects overlap and none is Swagger-only. Concrete endpoint
selection removes 36 old nonendpoint findings without adding a finding.
Eighteen native tests and seven strict comparison fixtures pass. Actual
selected-version projection excludes two historical Kubernetes declarations,
leaving 38 native findings in 14 projects. The remaining difference of 13 is
explained by ten common SDK-name overrides, one emitter-relevant scoped override,
and two Delete-prefixed groups. The rule needed an endpoint-selection fix;
the naming-domain and serialized-ID exemptions remain intentionally outside its
authored-name contract. Coverage is **partial**, not exact Swagger equivalence.
The older external 100% category does not establish semantic equivalence.

## Native contract and coverage gate

The guideline is that a concrete HTTP DELETE operation's authored name starts
with `delete`, case-insensitively. Report one warning on the offending operation,
regardless of response shape. The rule applies to both ARM and data-plane HTTP
services and does not require provider metadata. It deliberately does not
resolve SDK names or serialized operation IDs.

The fetched migration target at `888ccb9ce7e9f49320d47af514611006610aba6c`
contains Azure Core `use-standard-names`, registered in `src/linter.ts`. Its
DELETE branch checks the case-sensitive authored `op.name.startsWith("delete")`.
The data-plane ruleset enables it; the ARM ruleset explicitly disables it.
Consequently the coverage gate is **partial**, not an absence of all prior art.
This source change addresses the uncovered ARM audience and erroneous
nonendpoint population; it does not introduce another official authored-name
rule for data-plane services.

ARM `ArmResourceDeleteSync` and `ArmResourceDeleteWithoutOkAsync` prescribe
HTTP semantics but preserve the chosen operation name. The native tests compile
both `remove is ArmResourceDeleteSync<Widget>` and the compliant `delete` form
without unrelated errors. Standard templates therefore do not prevent the
naming violation. The maintained ARM rule inventory and RPC coverage document
contain no DELETE SDK naming rule. RPC023 concerns whether DELETE is honored at
runtime, not its method name. Validator metadata supplies no RPC code; its source
comment refers to SDK guideline M1009.

The intended official destination is TCGC under the coordinator's explicit
common SDK naming-family adaptation: resolve common method names through
supported TCGC APIs while preserving endpoint selection, DELETE verb,
case-insensitive prefix, severity, and operation targets. That approved
adaptation is not implemented in this immutable-source development phase.
Source corpus counts must not be represented as validating future SDK-name
override semantics.

## Implementation decision

**TypeSpec rule update required and completed.** Replace the general operation
listener with `getAllHttpServices` and inspect each service's concrete
operations. The previous listener reported an out-of-service
`removeForClient` alongside the real `remove` endpoint. The paired regression
now reports only the real endpoint. The neighboring PUT and PATCH naming rules
use the same supported HTTP semantic layer; no custom traversal, private
metadata, emitter, reference-string inference, SDK dependency, or compiler
mutation is needed.

The warning is now concise: `DELETE operation 'remove' should start with
'delete'.` Compatibility and suppression guidance belongs in `rule.md`.
The authored operation remains the diagnostic target, explicitly asserted in
the interface-prefix test.

Required changes are confined to `src/rules/delete-in-operation-name.ts`, its
native tests, directly related comparison fixtures/snapshots, `rule.md`, and this
note. No validator, emitter, dataset, or corpus-runner change is required.

## Validator behavior and supported-shape matrix

The validator's resolved OAS2 selector visits DELETE `operationId` fields under
both `paths` and `x-ms-paths`. Empty/non-string IDs and every ID without an
underscore are ignored. Remaining IDs pass either case-sensitive regex
`^(\w+)_(Delete)` or `^(Delete)`. The second pattern can accept a group whose
name begins `Delete` even when the actual method does not.

Research source:
[implementation](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/delete-in-operation-name.ts)
and
[documentation](https://github.com/Azure/azure-openapi-validator/blob/main/docs/delete-in-operation-name.md).
The installed fixture validator is `@microsoft.azure/openapi-validator-rulesets`
2.2.5. Its emitted JavaScript has the same selector and regexes as the inspected
checkout. The retained Swagger dataset does not record its resolved validator
package revision, so generator-side validator provenance is incomplete.

All comparison rows below are compiled supported HTTP inputs with no compiler
errors. `resolveOperationId` in the AutoRest emitter explains the serialized
values; it is research evidence, not part of the native implementation.

| Authored shape                                               | Emitted DELETE operationId                | Swagger result                          | Native result             | Evidence                                                                                                                                                                 |
| ------------------------------------------------------------ | ----------------------------------------- | --------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Interface `Widgets.remove`                                   | `Widgets_Remove`                          | Warn                                    | Warn on `remove`          | `remove-endpoint`                                                                                                                                                        |
| Interface `Widgets.deleteWidget`                             | `Widgets_DeleteWidget`                    | No warning                              | No warning                | `delete-endpoint`                                                                                                                                                        |
| Common `@clientName("delete")` on `Widgets.remove`           | `Widgets_Delete`                          | No warning                              | Warn on authored `remove` | `common-name-fixes-id`                                                                                                                                                   |
| Common `@clientName("remove")` on `Widgets.deleteWidget`     | `Widgets_Remove`                          | Warn                                    | No warning                | `common-name-invalidates-id`                                                                                                                                             |
| Standalone `remove` in service namespace                     | `Remove`                                  | No warning: no underscore               | Warn on `remove`          | `ungrouped-remove`                                                                                                                                                       |
| `DeleteWidgets.remove`                                       | `DeleteWidgets_Remove`                    | No warning: group starts `Delete`       | Warn on `remove`          | `delete-group-remove`                                                                                                                                                    |
| ARM custom DELETE action `Widgets.remove`                    | `Widgets_Remove`                          | Warn                                    | Warn                      | Existing `compliant-with-template`; ARM action diagnostic is explicitly suppressed, so this is compatibility evidence, not the proof of supported template customization |
| Standard ARM template customized to `remove` versus `delete` | Serialization not used in the native test | Not measured by that test               | Warn versus no warning    | Native `checks a supported ARM template name %s` cases compile without emitter registration                                                                              |
| Client-only DELETE declaration outside the service           | Not an emitted service endpoint           | Outside the selected Swagger population | No warning after fix      | Native paired service/customization regression                                                                                                                           |

For every comparison fixture, the selected OpenAPI field is present; its value
is recorded above. Non-DELETE verbs are excluded before the prefix predicate;
GET, POST, PUT, and PATCH controls are native tests. Prefix case is intentionally
normalized in native TypeSpec; its four accepted forms are separately tested.
No OpenAPI override or generated-reference heuristic expands the native
contract. Azure Core's `no-openapi` documentation identifies explicit
`@operationId` as authoring that should instead use supported naming metadata.

The source tests use HTTP-only libraries for ordinary semantic cases and
register ARM's transitive dependencies only for the two template cases. No
native test imports or executes the AutoRest emitter or uses TCGC to implement
the check. SDK override comparison remains in the migration harness.

## Report reconciliation and reproducibility

| Report                                                                      | Population                                                     | Validator projects | Native projects | Official credit | Overlap                   | Validator-only | Native-only  | Swagger/native diagnostics |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------ | --------------- | --------------- | ------------------------- | -------------- | ------------ | -------------------------- |
| [External aggregate](../../../docs/coverage_old.md), 100% coverage category | 450 compiled; 210 validator rules                              | 9                  | 9               | 0               | Not individually supplied | Not supplied   | Not supplied | Not supplied               |
| Retained [coverage report](../../../specs/coverage-breakdown.md)            | 462/468 successful; 215 validator rules                        | 9                  | 19              | No              | 9                         | 0              | 10           | 25/76                      |
| Refreshed full production run                                               | 462/468 successful                                             | 9                  | 15              | No              | 9                         | 0              | 6            | 25/40                      |
| Selected-latest-version attribution                                         | Successful projects; two proven historical operations excluded | 9                  | 14              | No              | 9                         | 0              | 5            | 25/38                      |

The external report credits migration dispositions and official mappings.
The local report measures observed same-project overlap among successfully
compiled projects. The aggregate does not provide its specs revision, generation
time, generator revision, or per-project diagnostics; individual differences
cannot be inferred by subtraction. The retained local row and raw native shard
also have different failure populations: its raw shard contains 84 findings in
20 projects, while the row excludes failed projects from both engines.

- Specs revision: `f6b53f105b95da05276530a0754a1c71b4f16397`.
- Development baseline: `888ccb9ce7e9f49320d47af514611006610aba6c`.
- Swagger dataset generation: `2026-08-06T08:03:27.940Z`, generator
  `test/harness/spec-dataset.ts`; ARM AutoRest validator pipeline; selected latest
  API version; readme suppressions are not applied.
- Retained native generation: `2026-08-10T09:38:18.108Z`.
- Refreshed native generation: `2026-10-12T04:14:23.100Z`; full analysis duration
  1,178,661 ms. The run uses `tsp-lintdiff-local-linter/all` and has no filter.
- Native lint operates on the unprojected source program, including authored
  suppressions and declarations from older API versions.
- Required representative selector: literal, case-sensitive
  `Automation.Management`, verified to match two projects; both compiled
  successfully before the full run.
- Full run command:

  ```powershell
  mise exec -- pnpm --dir packages\typespec-lintdiff specs:typespec --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-delete-in-operation-name --concurrency 6
  ```

Generated reports and rule shards are validation evidence only. A clean
pre-run manifest captures their original bytes; after all writers finish,
the helper archives the generated result, plans exact changes, and restores
the approved baseline. They must not enter the rule PR.

## Focused validation and diagnostic noise

The emitter-free native suite has 18 passing cases: violating/compliant authored
prefixes, case-insensitive prefixes, four non-DELETE verb controls, an
interface/group prefix that must not mask a bad method, the service versus
client-only selection regression, exact diagnostic targeting, the actual
published HTTP examples, and standard ARM template customization.

Strict fixture validation has seven cases, with matching snapshots and zero
unresolved gaps: two partial-mapping violations, three explained
native-only comparisons, one reviewed-ambient compliance control, and one
reviewed validator-only naming discrepancy. The initial expanded-matrix run
failed because `common-name-invalidates-id` was incorrectly labeled a native
violation despite the valid authored name. Its corrected compliance expectation
records one exact Swagger diagnostic and both unrelated ambient codes; the
original failing receipt is preserved. This is a fixture-intent correction, not
a weakened native prefix check.

The compliant fixture's ambient diagnostics concern operation-ID noun/verb
formatting, path-parameter constraints, and missing examples; none is this
rule's warning. The misleading historical directory name
`compliant-with-template` is retained for traceability, but its `expect.json`
correctly declares a violation.

The installed noise audit has no focused selector. Its supporting audit of 245
violation fixtures passed. All five violation fixtures for this rule have zero
official diagnostics and are classified `gap_no_tsp_diagnostics`. This audit
intentionally omits the local-linter enable argument when invoking
`compile-worker.ts`: its findings measure official coverage, not the updated
local rule. The strict seven-case comparison run separately enables the local
linter and verifies its exact diagnostics. Neither supporting audit replaces
the native diagnostic assertions or the full corpus.

## Full corpus assessment

### Cardinality and populations

| Population                                            | Swagger raw / file-aware identity / file-independent identity | Native raw / source identity | Swagger / native projects | Equal-count projects | Swagger-higher projects | Native-higher projects | Native-positive / Swagger-positive difference |
| ----------------------------------------------------- | ------------------------------------------------------------- | ---------------------------- | ------------------------- | -------------------- | ----------------------- | ---------------------- | --------------------------------------------- |
| All raw projects, including failed compilation        | 25 / 25 / 25                                                  | 48 / 48                      | 9 / 16                    | 8                    | 0                       | 8                      | 23 / 0                                        |
| Successfully compiled projects, production comparison | 25 / 25 / 25                                                  | 40 / 40                      | 9 / 15                    | 8                    | 0                       | 7                      | 15 / 0                                        |
| Selected-version attribution                          | 25 / 25 / 25                                                  | 38 / 38                      | 9 / 14                    | 8                    | 0                       | 6                      | 13 / 0                                        |

Swagger file-aware identity is project + Swagger file + JSON path;
file-independent identity is project + JSON path. Native source identity is
project + source file + line + column. These remain different identity domains:
no property-name, suffix-only, or guessed canonical identity is used to declare
one-to-one equivalence. Repeated `purge`/`restore` names in Cosmos DB and
`purge` names in Site Recovery belong to distinct interfaces and endpoints.

The retained raw native shard had 84 findings and 57 source identities in
20 projects. The current raw shard has 48 findings and 48 source identities
in 16 projects. Comparing exact source identities shows 36 removed raw findings
and no added findings:

- Compute/Compute: 17 nonendpoint template-instance findings.
- Compute/ComputeDisk: five nonendpoint template-instance findings.
- Compute/ComputeGallery: nine nonendpoint template-instance findings.
- ManagementGroups: one nonendpoint `ArmDeleteOperation` helper finding at
  `back-compatible.tsp:221`.
- Search: four client customization findings in `client.tsp` at lines
  239, 292, 462, and 654.

The template instances demonstrate why raw counts and semantic source identities
can differ. Their removal is an endpoint-selection correction, not suppression,
SDK-name normalization, or a change to the prefix predicate.

### Complete successful-project comparison

Project labels below identify the same dataset entries used by the report.
All nine nonzero Swagger projects overlap the native set.

| Project                       | Swagger | Native | Native minus Swagger | Assessment                                                |
| ----------------------------- | ------- | ------ | -------------------- | --------------------------------------------------------- |
| APIManagement / ApiManagement | 3       | 11     | 8                    | Seven common overrides; one Delete-prefixed group         |
| CognitiveServices.Management  | 0       | 1      | 1                    | Delete-prefixed group                                     |
| Cosmos DB / DocumentDB        | 6       | 6      | 0                    | Three distinct `restore` and three `purge` endpoints      |
| DataFactory                   | 0       | 1      | 1                    | Common name override                                      |
| HDInsight                     | 3       | 3      | 0                    | Three `disable*` DELETE endpoints                         |
| KubernetesRuntime             | 0       | 2      | 2                    | Historical declarations absent from selected version      |
| OperationalInsights           | 0       | 1      | 1                    | Common name override                                      |
| DBforPostgreSQL.Management    | 1       | 1      | 0                    | `Migrations_Cancel`                                       |
| RecoveryServices              | 0       | 1      | 1                    | Scoped name override consumed by the emitter              |
| RecoveryServicesBackup        | 1       | 1      | 0                    | `ProtectionContainers_Unregister`                         |
| SiteRecovery                  | 5       | 5      | 0                    | Five distinct replication `purge` endpoints               |
| Search                        | 0       | 1      | 1                    | Common name override                                      |
| Security / ApiCollectionsAPI  | 1       | 1      | 0                    | `APICollections_OffboardAzureApiManagementApi`            |
| SecurityInsights              | 1       | 1      | 0                    | `ContentPackage_Uninstall`                                |
| Web / AppService              | 4       | 4      | 0                    | Two `detach*` and two `unlink*` endpoints                 |
| **Total**                     | **25**  | **40** | **15**               | **38 native / difference 13 after historical exclusions** |

The complete production Swagger-only list is empty. The six native-only entries
are:

1. `specification/cognitiveservices/CognitiveServices.Management`
2. `specification/datafactory/resource-manager/Microsoft.DataFactory/DataFactory`
3. `specification/kubernetesruntime/resource-manager/Microsoft.KubernetesRuntime/KubernetesRuntime`
4. `specification/operationalinsights/resource-manager/Microsoft.OperationalInsights/OperationalInsights`
5. `specification/recoveryservices/resource-manager/Microsoft.RecoveryServices/RecoveryServices`
6. `specification/search/resource-manager/Microsoft.Search/Search`

Selected-version attribution removes KubernetesRuntime from that list.
The all-raw native-only list additionally contains
`specification/network/resource-manager/Microsoft.Network/Network/Network`,
whose failed compilation excludes its eight warnings from the production
comparison. It is not evidence of a successfully validated service.

### Attribution of the selected-version difference

APIManagement is the largest successful outlier: native 11 versus Swagger
three. The three common violations serialize as `Tag_DetachFromOperation`,
`Tag_DetachFromApi`, and `Tag_DetachFromProduct`. The other eight findings are
fully explained by the following rows. Every serialized value was read from
the selected-version file listed in the dataset's `swaggerFiles` metadata.

| Project and authored name                                 | Emitted DELETE operationId                   | Cause and source                                                                  |
| --------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| APIManagement `gatewayApiDelete`                          | `GatewayApi_Delete`                          | Common name/location; `back-compatible.tsp:1136–1137`                             |
| APIManagement `groupUserDelete`                           | `GroupUser_Delete`                           | Common name/location; `back-compatible.tsp:1210–1211`                             |
| APIManagement `workspaceGroupUserDelete`                  | `WorkspaceGroupUser_Delete`                  | Common name/location; `back-compatible.tsp:1217–1218`                             |
| APIManagement `notificationRecipientEmailDelete`          | `NotificationRecipientEmail_Delete`          | Common name/location; `back-compatible.tsp:1340–1344`                             |
| APIManagement `workspaceNotificationRecipientEmailDelete` | `WorkspaceNotificationRecipientEmail_Delete` | Common name/location; `back-compatible.tsp:1389–1396`                             |
| APIManagement `productApiDelete`                          | `ProductApi_Delete`                          | Common name/location; `back-compatible.tsp:479–480`                               |
| APIManagement `productGroupDelete`                        | `ProductGroup_Delete`                        | Common name/location; `back-compatible.tsp:493–494`                               |
| APIManagement `DeletedServices.purge`                     | `DeletedServices_Purge`                      | Validator group-prefix exemption; `DeletedServiceContract.tsp:50`                 |
| CognitiveServices `DeletedAccounts.purge`                 | `DeletedAccounts_Purge`                      | Validator group-prefix exemption; `Account.tsp:311`                               |
| DataFactory `integrationRuntimeNodesDelete`               | `IntegrationRuntimeNodes_Delete`             | Common name/location; `IntegrationRuntimeResource.tsp:326`, `back-compatible.tsp` |
| OperationalInsights `gatewaysDelete`                      | `Gateways_Delete`                            | Common name/location; `Workspace.tsp:251`, `back-compatible.tsp`                  |
| RecoveryServices `registeredIdentitiesDelete`             | `RegisteredIdentities_Delete`                | `@@clientName(..., "Delete", "!csharp")`; `Vault.tsp:236`, `back-compatible.tsp`  |
| Search `queryKeysDelete`                                  | `QueryKeys_Delete`                           | Common name/location; `SearchService.tsp:411`, `back-compatible.tsp`              |

Thus the selected difference of 13 is ten common overrides, one scoped override,
and two group exemptions. The common SDK-name promotion adaptation can address
the common overrides; its deliberate scoped-override policy must be tested
separately. It must not silently adopt whichever emitter scope produced a
serialized ID.

### Compile failures and remaining uncertainty

All six failure identities exactly match the retained native index; there are
no newly failed projects. Their raw compiler diagnostics, not this rule's
warning, explain the failures:

| Dataset project                                             | Compiler error evidence                                                       |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `deviceprovisioningservices/.../DeviceProvisioningServices` | `@typespec/http/duplicate-body` at `client.tsp:469`                           |
| `monitor/.../Insights/TenantActionGroups`                   | `@typespec/http/missing-uri-param` for legacy operation route parameters      |
| `network/.../Network/Network`                               | `@typespec/http/missing-uri-param` for `applicationGatewayAvailableSslOption` |
| `quota/.../Quota`                                           | `@typespec/http/missing-uri-param` for legacy operation route parameters      |
| `resources/.../deployments`                                 | `@typespec/http/duplicate-body` in legacy operation templates                 |
| `servicelinker/.../ServiceLinker`                           | `@typespec/http/duplicate-body` at `client.tsp:195`                           |

No failed project is repaired or retried in this rule task. The coverage result
is limited to the 462 successful projects; the complete raw findings remain
available as evidence, not asserted native compliance. The external aggregate's
unrecorded source revision and the Swagger generator's unrecorded resolved
validator revision prevent a stronger cross-report provenance claim. Supported
shape tests and direct validator-source inspection establish the documented
native contract and intentional gaps; observed corpus overlap alone does not.

## Gap examples

### Authored name hidden by a common SDK override

- **Classification:** Native-only.
- **Status:** Intentional source name-domain difference.
- **Project/API version:** Search / `2026-09-01-preview`.
- **Source:** `SearchService.tsp:411` and `back-compatible.tsp`.

Naming-relevant excerpt; unchanged header/error customization is omitted:

```typespec
@delete
queryKeysDelete is QueryKeysDeleteOps.ActionSync<
  SearchService,
  void,
  OkResponse | NoContentResponse | NotFoundResponse
>;
@@clientLocation(SearchServices.queryKeysDelete, "QueryKeys");
@@clientName(SearchServices.queryKeysDelete, "Delete");
```

```json
{ "operationId": "QueryKeys_Delete" }
```

The native source checks `queryKeysDelete` and warns; the validator sees the
accepted `QueryKeys_Delete` ID and stays silent. The comparison fixture
`common-name-fixes-id` proves the same distinction directly. The complete
override attribution is recorded in the full-run assessment above.
The planned TCGC common-name adaptation addresses the SDK name domain separately.

### A Delete-prefixed group exempts a non-delete method

- **Classification:** Native-only.
- **Status:** Intentional serialized-group exemption.
- **Project/API version:** CognitiveServices.Management / `2026-07-01`.
- **Source:** `Account.tsp:311`, `DeletedAccounts.purge`.

```typespec
interface DeletedAccounts {
  purge is DeletedAccountOps.DeleteWithoutOkAsync<
    Account,
    Response = ArmDeletedResponse | ArmDeleteAcceptedLroResponse | ArmDeletedNoContentResponse
  >;
}
```

```json
{ "operationId": "DeletedAccounts_Purge" }
```

The validator's `^(Delete)` expression matches the group prefix, not the
method. The native rule warns on `purge`. The independently compiled
`delete-group-remove` fixture reproduces this cause. APIManagement's
`DeletedServices_Purge` has the same exemption.

### Historical DELETE operations absent from the selected API version

- **Classification:** Native-only.
- **Status:** API-version population mismatch, not a missed native check.
- **Project/API version:** KubernetesRuntime / `2024-03-01`.
- **Source:** `loadbalancer.tsp:71` and `bgppeer.tsp:52`.

```typespec
@sharedRoute
@added(Versions.v2024_03_01)
delete is ArmResourceDeleteSync<LoadBalancer>;
@sharedRoute
@renamedFrom(Versions.v2024_03_01, "delete")
@removed(Versions.v2024_03_01)
oldDelete is ArmResourceDeleteWithoutOkAsync<LoadBalancer>;
```

The raw native program contains `oldDelete`; the selected API version removes
it and emits the compliant `LoadBalancers_Delete` endpoint instead. BgpPeers has
the same decorators and selected-version exclusion. There is no selected-version
Swagger operation corresponding to either old declaration, so comparison must
exclude these two findings without suppressing their raw native diagnostics.
The existing `projected-enum-worker.ts` independently compiled and projected
the service to `2024-03-01` through `getVersioningMutators`. Its reachable
operation locations contain the replacement declarations at
`loadbalancer.tsp:66` and `bgppeer.tsp:47`, but not the historical declarations
at lines 71 and 52 respectively. This is actual projected-service evidence,
not a filename-based diagnostic filter.

## Conclusion

The source rule implements an idiomatic authored-name policy, with explicitly
partial Swagger mapping. The endpoint-selection defect is fixed and supported
by native regression tests and the removal of 36 nonendpoint corpus findings.
All remaining observed differences in successful projects are explained by
name-domain, group-prefix, or actual selected-version evidence. No implementation
is added for serialized-ID exemptions. Six preexisting compiler failures and
incomplete older-report validator provenance remain disclosed limitations.
No claim of universal or exact Swagger functional equivalence is made from
fixture overlap or raw-count equality.
