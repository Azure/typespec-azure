# XmsResourceInPutResponse migration

## Result and gap summary

The full 2026-09-16 ARM corpus assessed **462/468 projects**: Swagger reported **47 findings in
13 projects**, versus **60 native findings in 20 projects**, with **9 projects overlapping**.
Swagger checks arbitrary success schemas; this narrower native rule checks resource-shaped
models and requires registered ARM identity. Four Swagger-only projects return other shapes.
Eleven TypeSpec-only projects use unregistered inherited/custom resources; their **26 findings
also occur as selected-version PUT responses**, not merely old-version declarations.
The raw totals, **155/167**, include **108/107 findings in the failed Network project**.

**Rule update completed:** removed the prohibited OpenAPI-extension exemption, retained native
ARM resource lookup, and added emitter-free supported-authoring tests. The corpus counts did
not change from the earlier completed run. **Exact Swagger equivalence remains partial**:
non-resource-shaped schemas, raw extension overrides and Legacy authoring are outside the
native contract. Neither matching counts nor corpus overlap establishes universal equivalence;
historical-shape reconstruction remains unsupported.

## Native decision and evidence

Production now depends only on the compiler, HTTP and ARM semantic APIs. It selects the first
model body under 200, otherwise 201, checks direct or inherited `name` and `type` properties,
and accepts registered resources via `getArmResource`. The existing narrower shape policy and
per-operation diagnostic cardinality are unchanged. It no longer imports `@typespec/openapi`
or accepts `@extension("x-ms-azure-resource", true)` as native resource identity.

The standard resource templates already supply ARM identity. A supported remaining gap is a
decorated manual operation returning an unregistered resource-shaped model. The new
`test/rules/xms-resource-in-put-response.test.ts` compiles such an operation without an emitter
or suppressions, verifies that both `arm-resource-operation` and
`arm-resource-operation-response` are silent, and requires the local diagnostic. The latter
official rule only compares response models that are themselves registered resources.
This establishes partial official coverage without relying on the older raw-operation
suppression fixtures.

The original registration fix is preserved: exact base-marker `isAzureResource` was replaced
by `getArmResource` in the earlier source commit. The new correction does not restore emitter
metadata through another helper. A considered `getCustomResourceOptions` exemption was omitted:
its new branch was justified only by Legacy authoring rejected by `no-legacy-usage`, not by a
supported normal ARM shape. Standard resource controls replace the old fixture that suppressed
`no-openapi`.

See [rule.md](./rule.md) for pinned validator implementation/docs/tests, the complete
native/emission matrix, prerequisite diagnostics, and the lintdiff-only namespace guard to
remove when adapting into an ARM-only ruleset.

## Reproducibility and populations

- Specs repository: `Azure/azure-rest-api-specs`, commit
  `f6b53f105b95da05276530a0754a1c71b4f16397`.
- Validator source inspected: `Azure/azure-openapi-validator`, commit
  `6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f`; fixture execution uses the installed
  `@microsoft.azure/openapi-validator-rulesets` dependency.
- Source starting head: `e32c35017be66df66ba90cab83b4a595a21558cb`; compiler submodule:
  `a6137cac43a727ce0c2656364fd72d50c272ee4a`.
- Full runner: `test/harness/typespec-results.ts`; **468 projects**, no filter/limit,
  concurrency 6. Representative preflight used the literal `apicenter` filter: one project.
- The full runner uses `--no-emit --warn-as-error=false`; successful compilation therefore
  does not mean a source has no Azure guideline warnings or suppressions.
- Retained Swagger and source snapshots are the pinned dataset, not a fresh emission of every
  corrected source. README suppressions were not applied to the retained validator results.
- Production validator mode, not staging. Both comparison sides exclude compiler-failed
  projects. Raw shards retain those diagnostics for inspection.
- This rule has no `projectionScope` setting. The runner's **60 is not itself a projected
  count**. Separate selected-version HTTP snapshot attribution below verifies every
  TypeSpec-only target and its PUT occurrence count.
- Version projection is comparison research using the existing projected-worker APIs. The
  production rule neither mutates a compiler subgraph nor constructs historical versions.

Required commands were scoped to this package/rule:

```text
pnpm --dir packages/typespec-lintdiff build
pnpm --dir packages/typespec-lintdiff exec vitest run test/rules/xms-resource-in-put-response.test.ts
pnpm --dir packages/typespec-lintdiff validate --rule XmsResourceInPutResponse --update-snapshots
pnpm --dir packages/typespec-lintdiff validate --rule XmsResourceInPutResponse
pnpm --dir packages/typespec-lintdiff specs:typespec --specs-repo <recorded-specs-worktree> --concurrency 6
```

Formatting uses explicit maintained files; lint uses only the changed TypeScript source/test.
Comparison snapshots are produced by the harness, not reformatted. Generated corpus files are
validation artifacts and are excluded from the source PR.

## Reconciliation with earlier reports

| Report                                                                            | Population and meaning                                                                                                                                             | Rule row                                                                    |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `packages/typespec-lintdiff/docs/coverage_old.md`                                 | 450 compiled projects, 210 rules; aggregate migration-credit report. Exact specs/generator revision and unmatched-project list are not recoverable from this file. | Validator fired in 391 projects; local credit 2; official credit 0; 0.5%.   |
| Committed `specs/coverage-breakdown.md`, before this migration's registration fix | 468 source projects, 462 successful, six failed; same-project diagnostic overlap, not credit for mappings/templates.                                               | Swagger 13 projects/47 findings; TypeSpec 3/10; overlap 0.                  |
| Full rerun for this native-boundary correction                                    | Same pinned 468-project dataset; 462 successful; source correction and current installed dependencies.                                                             | Swagger 13/47; TypeSpec 20/60; overlap 9; Swagger-only 4; TypeSpec-only 11. |

The external report's 391 cannot be subtracted from 13 to infer missing projects: its
per-project identities and source revision are unavailable. The older three TypeSpec-only
projects (ApiCenter, ManagementGroups, Authorization policy) motivated the preserved registered
resource fix. The current full run reproduces the earlier completed migration's 47/60 row,
but re-investigation corrects its explanations:

1. The 155-to-47 Swagger and 167-to-60 TypeSpec reductions are **failed-project exclusions**,
   not API-version projection.
2. The four current Swagger-only projects do **not** all demonstrate unresolved external
   resource ancestry. Their selected schemas lack the native `name`/`type` resource shape.
3. TypeSpec-only findings are not all explicitly unmarked resources. Kusto and Operational
   Insights explicitly emit resource metadata through Legacy options; other models inherit
   it without native ARM registration.

## Complete project comparison

Paths below are relative to the pinned specs repository. V/T are assessed raw diagnostic
counts; T-source counts distinct `(project, source file, line, column)` identities.

| Project                                                                                                    | Selected API version |   V |   T | T-source |
| ---------------------------------------------------------------------------------------------------------- | -------------------- | --: | --: | -------: |
| `specification/advisor/resource-manager/Microsoft.Advisor/Advisor`                                         | 2026-03-01-preview   |   0 |   2 |        1 |
| `specification/apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement`                       | 2025-09-01-preview   |   0 |   4 |        2 |
| `specification/appconfiguration/resource-manager/Microsoft.AppConfiguration/AppConfiguration`              | 2025-08-01-preview   |   0 |   1 |        1 |
| `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/AnalyticsItems` | 2015-05-01           |   1 |   0 |        0 |
| `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/ComponentAPIs`  | 2015-05-01           |   4 |   0 |        0 |
| `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/Components`     | 2020-02-02           |   0 |   1 |        1 |
| `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/Favorites`      | 2015-05-01           |   1 |   0 |        0 |
| `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WebTestsApi`    | 2022-06-15           |   0 |   1 |        1 |
| `specification/automation/Automation.Management`                                                           | 2024-10-23           |   2 |   1 |        1 |
| `specification/azure-kusto/resource-manager/Microsoft.Kusto/Kusto`                                         | 2025-02-14           |   0 |   2 |        2 |
| `specification/compute/resource-manager/Microsoft.Compute/Compute/Compute`                                 | 2026-03-01           |   2 |   2 |        2 |
| `specification/confluent/resource-manager/Microsoft.Confluent/Confluent`                                   | 2026-06-02-preview   |   1 |   1 |        1 |
| `specification/containerinstance/resource-manager/Microsoft.ContainerInstance/ContainerInstance`           | 2026-08-01-preview   |   0 |   1 |        1 |
| `specification/datadog/resource-manager/Microsoft.Datadog/Datadog`                                         | 2025-12-26-preview   |   1 |   1 |        1 |
| `specification/frontdoor/resource-manager/Microsoft.Network/FrontDoor`                                     | 2025-11-01           |   0 |   5 |        5 |
| `specification/guestconfiguration/resource-manager/Microsoft.GuestConfiguration/Assignments`               | 2024-04-05           |   4 |   4 |        1 |
| `specification/keyvault/resource-manager/Microsoft.KeyVault/KeyVault`                                      | 2026-03-01-preview   |   1 |   1 |        1 |
| `specification/operationalinsights/resource-manager/Microsoft.OperationalInsights/OperationalInsights`     | 2025-07-01           |   0 |   1 |        1 |
| `specification/recoveryservices/resource-manager/Microsoft.RecoveryServices/RecoveryServices`              | 2026-05-31-preview   |   1 |   1 |        1 |
| `specification/resources/resource-manager/Microsoft.Resources/resources`                                   | 2025-04-01           |   2 |   0 |        0 |
| `specification/solutions/Solutions.Management`                                                             | 2023-12-01-preview   |   0 |   5 |        3 |
| `specification/sql/resource-manager/Microsoft.Sql/SQL`                                                     | 2025-02-01-preview   |   3 |   4 |        3 |
| `specification/trafficmanager/resource-manager/Microsoft.Network/TrafficManager`                           | 2024-04-01-preview   |   0 |   3 |        3 |
| `specification/web/resource-manager/Microsoft.Web/AppService`                                              | 2026-07-15           |  24 |  19 |        7 |

The nine overlap projects are Automation, Compute, Confluent, Datadog, GuestConfiguration
Assignments, KeyVault, RecoveryServices, SQL, and AppService. The four V-only and eleven T-only
sets are exactly the rows with T=0 and V=0 respectively; no one-sided project is omitted.

### Every TypeSpec-only project and API-version attribution

All 26 T-only occurrences match selected-version primary 200/201 PUT body targets, including
their per-source-location multiplicities. **Zero are excluded as older-version-only.**
This was checked by collecting the selected version's HTTP PUT operations, not by filtering
filenames or treating general model reachability as sufficient.

| Project shorthand               | Target/source evidence                                                                                  | Why native differs from retained Swagger                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Advisor                         | `models.tsp:450`, ConfigData, two selected PUT routes                                                   | Extends Foundations.Resource without registration; emitted schema references common Resource.                             |
| ApiManagement                   | `models.tsp:8016,8058`, RecipientUserContract and RecipientEmailContract; service/workspace route pairs | Inherits CommonTypes.ProxyResource without registered resource instances.                                                 |
| AppConfiguration                | `Snapshot.tsp:22`, one create PUT                                                                       | Suppressed Legacy.CustomAzureProxyResource false; emitted schema still inherits common ProxyResource.                     |
| ApplicationInsights Components  | `ApplicationInsightsComponent.tsp:23`                                                                   | Custom/inherited ComponentsResource base; prerequisite suppressions, no registered instance.                              |
| ApplicationInsights WebTestsApi | `WebTest.tsp:22`                                                                                        | Custom/inherited WebtestsResource base with prerequisite suppressions.                                                    |
| Kusto                           | `DataConnection.tsp:26`, `Database.tsp:26`                                                              | Explicit Legacy `isAzureResource: true` produces the emitted flag, not native registration.                               |
| ContainerInstance               | `ContainerGroup.tsp:22`                                                                                 | Legacy custom resource over Foundations.ProxyResource, with compatibility suppressions.                                   |
| FrontDoor                       | WebApplicationFirewallPolicy, FrontDoor, RulesEngine, Profile, Experiment (`*.tsp:20/22`)               | Five unregistered inherited Resource/BasicResource/ResourcewithSettableName models; emitted `allOf` bases carry metadata. |
| OperationalInsights             | `DataSource.tsp:25`                                                                                     | Explicit Legacy `isAzureResource: true`; no registered instance.                                                          |
| Solutions                       | `Application.tsp:20`, `ApplicationDefinition.tsp:20`, `JitRequestDefinition.tsp:30`; five PUTs          | Suppressed inherited GenericResource/Resource shapes; two models each serve two routes.                                   |
| TrafficManager                  | `Endpoint.tsp:23`, `Profile.tsp:21`, `UserMetricsModel.tsp:20`                                          | Inherited local resource bases and Legacy operations; compatibility suppressions.                                         |

These are observed differences on converted or nonstandard authoring, not proof that all
these services need an additional native production branch. In particular, the three
explicit-Legacy-true occurrences do not justify copying emitter marker logic. The supported
normal-authoring regression uses ordinary decorators and no Legacy/OpenAPI override.

## Cardinality and outliers

| Identity/population                                                               | Swagger |                     TypeSpec |
| --------------------------------------------------------------------------------- | ------: | ---------------------------: |
| Raw shards, including compiler failures                                           |     155 |                          167 |
| Raw `(project, Swagger file, JSON path)` / `(project, source file, line, column)` |     137 |                          145 |
| Raw file-independent `(project, JSON path)`                                       |      57 | Not the same identity domain |
| Successful-project raw diagnostics                                                |      47 |                           60 |
| Successful-project file/source identities                                         |      47 |                           39 |
| Successful-project file-independent Swagger paths                                 |      47 | Not the same identity domain |

Across the 24 affected successful projects, six have equal raw counts, six are
validator-higher, and twelve are TypeSpec-higher. The positive TypeSpec-minus-Swagger
differences sum to **27**, the negative differences to **14**, yielding net **+13**.
After native source-location deduplication the totals instead differ by **-8**. That is not
an equivalence metric: a model reused by several operations has one source location.

- **AppService:** 24 Swagger occurrences versus 19 native occurrences on seven models.
  Four KeyInfo responses (`name`, `value`, no `type`) and CreateOneDeployOperation account
  for five Swagger findings outside the native shape contract. Repeated app/slot/static-site
  operations explain why the 19 native occurrences collapse to seven model locations.
- **GuestConfiguration:** four PUT operations (VMSS, VM, connected VMware, HCRP) return the
  same GuestConfigurationAssignment at `GuestConfigurationAssignment.tsp:18`: 4/4 raw but
  only one native source identity.
- **Automation:** TestJob_Create returns a TestJob without resource-envelope properties;
  SourceControlSyncJob_Create returns the resource-shaped model at `models.tsp:5945`.
  This explains 2/1, not a deduplication issue.
- **SQL:** the two FirewallRule operations and one IPv6FirewallRule operation account for
  three Swagger findings. Native additionally reports DataMaskingRule at `models.tsp:7330`,
  which uses a suppressed Legacy feature and inherited CommonTypes.ProxyResource.
  Thus 3/4 raw becomes 3/3 identities without establishing one-to-one semantic parity.

The four V-only projects contribute eight more non-resource-shaped Swagger findings;
together with AppService's five and Automation's one, these account for the negative 14.
The eleven T-only projects contribute 26 native occurrences; SQL's additional one accounts
for the positive 27. Equal totals in other overlap projects are observational, not a proof
that every possible authoring shape is equivalent.

## Code-backed gap examples

### Non-resource-shaped response rather than an external-reference defect

- **Classification:** validator-only.
- **Status:** documented native-contract limitation, not full Swagger equivalence.
- **Project/API:** Resources/resources, `2025-04-01`.
- **Source:** `routes.tsp:245-298`, Tags createOrUpdateValue/createOrUpdate; both suppress
  `arm-resource-operation` as non-standard operations.

```typespec
// Selected response types in the existing operations:
ArmResponse<TagValue> | ArmResourceCreatedSyncResponse<TagValue> | CloudError
ArmResponse<TagDetails> | ArmResourceCreatedSyncResponse<TagDetails> | CloudError
```

The retained definitions have properties `id, tagValue, count` and
`id, tagName, count, values`, respectively, with no `allOf` resource ancestor or
`x-ms-azure-resource`. Swagger reports both PUTs. The native rule skips them because neither
has `name` plus `type`. AnalyticsItems uses uppercase Name/Type with casing suppressions;
Favorites lacks resource-envelope properties; ComponentAPIs returns Annotation arrays,
proactive-detection configuration, billing features and export configuration. All eight
V-only findings have this concrete shape explanation.

### Emitted Legacy marker is not registered native resource identity

- **Classification:** TypeSpec-only.
- **Status:** out-of-contract Legacy authoring; no emitter compatibility helper added.
- **Project/API:** Kusto, `2025-02-14`.
- **Source:** `DataConnection.tsp:24-26`.

```typespec
@Azure.ResourceManager.Legacy.customAzureResource(#{ isAzureResource: true })
@Http.Private.includeInapplicableMetadataInPayload(false)
model DataConnection extends Azure.ResourceManager.Foundations.ProxyResource {
  // Resource properties follow in the source.
}
```

The retained `DataConnection` definition explicitly contains:

```json
{ "x-ms-azure-resource": true }
```

Swagger reports no finding. Native reports the unregistered model. This is not a missing
emitted marker: `attachExtensions` in AutoRest observes the Legacy option. Azure Core's
`no-legacy-usage` rejects the underlying authoring; production lint must not reproduce it
through emitter state or a compatibility adapter. Database and OperationalInsights DataSource
provide the other two explicit-true occurrences.

### Inherited emitted metadata without registered resource construction

- **Classification:** TypeSpec-only.
- **Status:** documented semantic difference on inheritance/compatibility authoring.
- **Project/API:** Advisor, `2026-03-01-preview`.
- **Source:** `models.tsp:450`, with `composition-over-inheritance` suppressed.

```typespec
model ConfigData extends Azure.ResourceManager.Foundations.Resource {
  properties?: ConfigDataProperties;
}
```

Its emitted `allOf` references common-types v4 Resource; the retained validator reports no
finding. Native reports the unregistered model twice, for subscription and resource-group
PUT routes. Using emitted ancestry as native identity would reintroduce the forbidden
coupling. Standard registered-resource fixtures establish the supported alternative.

### Reused model versus emitted operation occurrences

- **Classification:** count-only.
- **Status:** intentional diagnostic cardinality, not normalization into equal counts.
- **Project/API:** GuestConfiguration Assignments, `2024-04-05`.
- **Source:** `GuestConfigurationAssignment.tsp:18`.

```typespec
model GuestConfigurationAssignment extends ProxyResource {
  properties?: GuestConfigurationAssignmentProperties;
}
```

Four retained PUT schemas refer to this definition, and four native operation visits target
the same declaration. Swagger and native both report four raw findings, but native
source-location deduplication yields one. This is why source identities cannot replace
operation-occurrence counts.

### Standard resource comparison fixture and external-reference resolution

- **Classification:** validator-only fixture discrepancy, not the cause of every V-only project.
- **Status:** intentional native semantics.
- **Source:** `put-arm-resource/main.tsp` and `put-with-azure-resource/main.tsp`.

```typespec
model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}
```

The corresponding tracked-resource snapshot inherits
`../../../../../common-types/resource-management/v3/types.json#/definitions/TrackedResource`.
Native accepts the registered Widget. Fixture validator execution reports one finding; its
helper walks inline `allOf`, while external resolution depends on the harness context.
Both tracked and proxy controls record that discrepancy explicitly. This fixture observation
does not justify labeling unrelated production TagDetails or Annotation schemas as validator
false positives.

## Compile failures and their effect

| Failed project                                                                                           | Observed compiler cause                                                  | Excluded V/T findings for this rule |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------: |
| `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices` | `@typespec/http/duplicate-body`, client.tsp:469                          |                                 0/0 |
| `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`                  | `@typespec/http/missing-uri-param`, legacy operation paths               |                                 0/0 |
| `specification/network/resource-manager/Microsoft.Network/Network/Network`                               | `@typespec/http/missing-uri-param`, applicationGatewayAvailableSslOption |                             108/107 |
| `specification/quota/resource-manager/Microsoft.Quota/Quota`                                             | `@typespec/http/missing-uri-param`, legacy operation paths               |                                 0/0 |
| `specification/resources/resource-manager/Microsoft.Resources/deployments`                               | `@typespec/http/duplicate-body`, legacy operation template               |                                 0/0 |
| `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`                     | `@typespec/http/duplicate-body`, client.tsp:195                          |                                 0/0 |

These are the same failed projects as the committed baseline. The runner exited successfully
and preserved failures; it did not assess Network's 108/107 findings. The generated row's empty
`unassessedProjects` array must not be read as evidence that no rule population was excluded:
the runner filters failed projects before constructing that field. No harness change is part
of this rule correction.

## Required changes and conclusion

- Remove the production OpenAPI import and extension-based compliance helper.
- Preserve ARM registration, HTTP selection, diagnostic targets and existing narrow shape scope.
- Add emitter-free native tests proving the supported gap and status/inheritance boundaries.
- Replace the raw OpenAPI compliance control with a registered ProxyResource control.
- Make the interface comparison fixture use normal operation metadata without suppressing
  `arm-resource-operation`; preserve its static route with the supported interface option.
- Refresh the directly related snapshots and this evidence.

The native correction is justified and validated for the stated resource-model contract.
It is **not functionally equal to every executable Swagger case**. Non-resource schemas,
suppressed emitter/Legacy overrides, arbitrary multi-content selection and historical shape
reconstruction are not certified by this migration. The 462-project observation and complete
one-sided attribution explain the measured gap without asserting universal parity or treating
the six compile failures as assessed services.
