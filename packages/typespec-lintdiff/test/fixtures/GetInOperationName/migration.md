# GetInOperationName migration evidence

## Conclusion

The migrated TypeSpec rule is functionally equivalent to the Swagger
`GetInOperationName` rule over the aligned, successfully compiled corpus. The
final full run has 26 validator projects, 26 TypeSpec projects, complete
same-project overlap, no one-sided projects, and 39 diagnostics from each
engine.

**TypeSpec rule update required:** yes. The previous rule checked the lowercased
TypeSpec operation name instead of the case-sensitive emitted AutoRest
`operationId`. It also reported generic template declarations and instances
that do not represent emitted operations. The updated rule:

- preserves explicit `@operationId` values;
- reproduces AutoRest naming for interfaces, namespaces, `@clientName`, and
  truthy `@clientLocation` values while ignoring an empty client location;
- applies AutoRest's underscore-segment capitalization;
- checks the original case-sensitive `Get`/`List` patterns; and
- ignores template declarations and instances while still checking concrete
  operations created from templates.

The focused fixtures cover lowercase explicit IDs, compliant explicit IDs,
template artifacts, and TCGC client-name/location overrides.

## Evidence revisions and populations

| Evidence                                                    | Revision and population                                                                                                                                                                                                                                              | `GetInOperationName` row                                                                                                                                                                                      |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [External coverage snapshot](../../../docs/coverage_old.md) | The checked-in snapshot links to [the source gist](https://gist.github.com/catalinaperalta/b2e7d29a33b4b451bcfcc87e8314565a), but does not record its generation date, spec commit, or generator revision. It reports 450 compiled projects and 210 validator rules. | `lint`; 26 validator projects fired; 24 local-lint projects credited; 0 official projects; 92.3%. Individual unmatched projects cannot be reconstructed from this aggregate row.                              |
| [Retained observed corpus evidence](./corpus-evidence.json) | Full run generated 2026-08-26 from specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`. The retained evidence records the command, source state, timestamp, duration, exact populations, failed projects, and complete overlap set.                              | `production`; `lint`; 26 validator projects; 26 TypeSpec projects; 26 overlap; 0 validator-only; 0 TypeSpec-only; 39 validator diagnostics; 39 assessed TypeSpec diagnostics; 100% observed project coverage. |

The package-level `specs/coverage-breakdown.md` and `specs/typespec-results.json`
remain the shared baseline snapshot generated before this rule update. They are
not the source for the final figures above; `corpus-evidence.json` retains the
rule-specific result from the completed full run.

The report totals differ for two concrete reasons:

1. The external snapshot used an unidentified older 450-project population,
   while lint-diff uses the pinned 468-project validator dataset and excludes
   six TypeSpec compile failures from behavioral comparison.
2. The external report's `Lint` column is aggregate migration credit. The
   lint-diff row requires observed diagnostics in the same successfully
   compiled project and separately reports one-sided projects and raw
   diagnostic totals.

Before this change, the checked-in observed row had 26 validator projects, 25
overlap projects, one validator-only project, 38 TypeSpec-only projects, 39
validator diagnostics, and 450 TypeSpec diagnostics. Correct case-sensitive
operation-ID handling covered the validator-only DataMigration project.
Ignoring non-emitted template artifacts reduced TypeSpec-only projects from 38
to 32 and diagnostics from 447 to 336 in the next full run. Reproducing
AutoRest's TCGC naming removed the remaining one-sided results and reduced the
final assessed TypeSpec count to 39.

## Aligned comparison

The validator corpus retains only the dataset-selected latest API version for
each project. TypeSpec diagnostics use the fixture's `http-reachable`
projection scope. Every assessed TypeSpec diagnostic in the final run belongs
to a project and operation represented in the selected Swagger population; no
older-version-only diagnostics were needed or excluded.

Six projects failed TypeSpec compilation and were excluded from both sides of
the behavioral comparison:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

The raw TypeSpec shard contains nine target diagnostics from two of these
failed projects: five from DeviceProvisioningServices and four from
Network/Network. They are retained in the generated evidence but are not used
to claim equivalence because no aligned emitted Swagger comparison completed.
The other four failed projects have no target diagnostic.

### Project sets

All 26 assessable validator projects are overlap projects:

- `specification/alertsmanagement/resource-manager/Microsoft.AlertsManagement/AlertsManagement`
- `specification/apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement`
- `specification/app/resource-manager/Microsoft.App/ContainerApps`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WorkbooksApi`
- `specification/automation/Automation.Management`
- `specification/billingbenefits/resource-manager/Microsoft.BillingBenefits/BillingBenefits`
- `specification/compute/resource-manager/Microsoft.Compute/Bulkactions`
- `specification/compute/resource-manager/Microsoft.Compute/Compute/Compute`
- `specification/cosmos-db/resource-manager/Microsoft.DocumentDB/DocumentDB`
- `specification/cost-management/resource-manager/Microsoft.CostManagement/CostManagement`
- `specification/datafactory/resource-manager/Microsoft.DataFactory/DataFactory`
- `specification/datamigration/resource-manager/Microsoft.DataMigration/DataMigration`
- `specification/developerhub/resource-manager/Microsoft.DevHub/DeveloperHub`
- `specification/devopsinfrastructure/resource-manager/Microsoft.DevOpsInfrastructure/DevOpsInfrastructure`
- `specification/guestconfiguration/resource-manager/Microsoft.GuestConfiguration/Assignments`
- `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/extensionTypes`
- `specification/marketplace/resource-manager/Microsoft.Marketplace/Marketplace`
- `specification/mysql/resource-manager/Microsoft.DBforMySQL/FlexibleServers`
- `specification/netapp/resource-manager/Microsoft.NetApp/NetApp`
- `specification/resources/resource-manager/Microsoft.Resources/resources`
- `specification/search/resource-manager/Microsoft.Search/Search`
- `specification/security/resource-manager/Microsoft.Security/Security/GovernanceAPI`
- `specification/securityinsights/resource-manager/Microsoft.SecurityInsights/SecurityInsights`
- `specification/storagesync/resource-manager/Microsoft.StorageSync/StorageSync`
- `specification/subscription/resource-manager/Microsoft.Subscription/Subscription`
- `specification/web/resource-manager/Microsoft.Web/AppService`

Validator-only projects: none.

TypeSpec-only projects: none.

## Diagnostic cardinality

| Population or identity                                             | Validator | TypeSpec |
| ------------------------------------------------------------------ | --------: | -------: |
| Full raw shard                                                     |        89 |       48 |
| Raw identity (`project + Swagger file + JSON path`)                |        76 |      N/A |
| File-independent validator identity (`project + JSON path`)        |        44 |      N/A |
| TypeSpec source identity (`project + source file + line + column`) |       N/A |       48 |
| Aligned selected-version, successfully compiled population         |        39 |       39 |
| Aligned conservative identity                                      |        39 |       39 |

The full validator shard includes repeated occurrences across emitted files and
API versions. The full TypeSpec shard includes the nine diagnostics from failed
projects described above. After selecting the retained Swagger versions and
excluding failed projects, all 26 overlap projects have equal per-project
counts. There are no validator-higher or TypeSpec-higher projects, and both the
positive and negative total count differences are zero.

The equality of the final aligned counts is supporting evidence, not the
migration criterion. Functional equivalence is based on matching semantics,
complete project overlap, focused fixtures, and resolution of every former
one-sided cause.

## Gap example: lowercase explicit operation ID

- **Classification:** validator-only
- **Status:** fixed
- **Project/API version:** `specification/datamigration/resource-manager/Microsoft.DataMigration/DataMigration` / `2025-09-01-preview`
- **Source:** `MigrationService.tsp`, operation `MigrationServices.listMigrations`

**TypeSpec source**

```typespec
@operationId("MigrationServices_listMigrations")
@list
@get
listMigrations is ArmResourceActionSync<
  MigrationService,
  void,
  ArmResponse<DatabaseMigrationBaseListResult>
>;
```

**Emitted OpenAPI**

```json
{
  "get": {
    "operationId": "MigrationServices_listMigrations"
  }
}
```

| Engine            | Observed result                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Diagnostic because lowercase `listMigrations` does not match case-sensitive `List`.                                                                                        |
| TypeSpec lint     | The updated rule reports the same emitted ID. The project now has two diagnostics in each engine, including the analogous `SqlMigrationServices_listMigrations` operation. |

**Explanation:** the former TypeSpec rule lowercased the source operation name,
so `listMigrations` was incorrectly accepted. The Swagger rule checks the
emitted ID without case normalization.

**Disposition:** preserve explicit IDs and apply the Swagger rule's
case-sensitive patterns.

## Gap example: generic template artifacts

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** focused fixture `template-declaration-ignored` / unversioned
- **Source:** generic `ArmResourceRead<T>` and concrete `getWidget`

**TypeSpec source**

```typespec
@get
op ArmResourceRead<T>(): T;

@route("/widgets/details")
op getWidget is ArmResourceRead<{
  @statusCode statusCode: 200;
  @body details: string;
}>;
```

**Emitted OpenAPI**

```json
{
  "get": {
    "operationId": "GetWidget"
  }
}
```

| Engine            | Observed result                                                      |
| ----------------- | -------------------------------------------------------------------- |
| Swagger validator | No diagnostic; only the concrete `GetWidget` operation is emitted.   |
| TypeSpec lint     | No diagnostic after template declarations and instances are ignored. |

**Explanation:** the former TypeSpec traversal reported generic helper
operations such as `ArmResourceRead` and `ArmResourceListByParent`, even though
those semantic artifacts had no corresponding emitted operation ID. Concrete
operations instantiated from a template remain checked.

**Disposition:** ignore template declarations and instances, not concrete
operations.

## Gap example: TCGC client name and location

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/AccessReview` / `2021-12-01-preview`
- **Source:** `back-compatible.tsp`,
  `ScopeAccessReviewHistoryDefinitions.scopeAccessReviewHistoryDefinitionInstancesList`

**TypeSpec source**

```typespec
@@clientLocation(
  ScopeAccessReviewHistoryDefinitions.scopeAccessReviewHistoryDefinitionInstancesList,
  "ScopeAccessReviewHistoryDefinitionInstances"
);
@@clientName(
  ScopeAccessReviewHistoryDefinitions.scopeAccessReviewHistoryDefinitionInstancesList,
  "List"
);
```

**Emitted OpenAPI**

```json
{
  "get": {
    "operationId": "ScopeAccessReviewHistoryDefinitionInstances_List"
  }
}
```

| Engine            | Observed result                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| Swagger validator | No diagnostic because the emitted ID has the valid noun-plus-`List` form.                                   |
| TypeSpec lint     | No diagnostic after resolving TCGC `@clientName` and `@clientLocation` state with an AutoRest TCGC context. |

**Explanation:** source-name reconstruction produced a longer invalid-looking
ID and ignored the compatibility decorators that AutoRest uses. The updated
resolver follows AutoRest's interface, namespace, client-location, and
capitalization branches.

**Disposition:** resolve the effective AutoRest operation ID before applying
the Swagger regex.

## Fixture evidence

| Fixture                           | Expected behavior                                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `lowercase-emitted-list`          | Both engines diagnose the lowercase explicit `Widgets_listMigrations` ID.                                            |
| `compliant-with-template`         | Both engines diagnose the concrete emitted `Widgets_FetchDetails` ID while template artifacts are ignored.           |
| `emitted-operation-id-compliant`  | Both engines accept explicit `Widgets_GetDetails` even though the TypeSpec source operation is named `fetchDetails`. |
| `template-declaration-ignored`    | Both engines accept emitted `GetWidget` and do not diagnose its generic helper.                                      |
| `client-name-location-compliant`  | Both engines accept the TCGC-resolved `ScopeAccessReviewHistoryDefinitions_List` ID.                                 |
| `empty-client-location-compliant` | Both engines ignore an empty `@clientLocation` and accept emitted `GetWidget`.                                       |

## Remaining uncertainty

No behavioral or project-set gap remains in the aligned corpus. Independent
review identified and corrected AutoRest's special handling of an empty
`@clientLocation`; the added focused fixture covers that branch. The only
uncertainty is the six TypeSpec compile failures, including nine raw target
diagnostics in two failed projects. Those diagnostics were not silently
discarded, but they cannot support a Swagger-to-TypeSpec equivalence claim
until the projects compile successfully.
