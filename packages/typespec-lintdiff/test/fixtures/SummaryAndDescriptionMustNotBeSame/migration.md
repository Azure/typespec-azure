# SummaryAndDescriptionMustNotBeSame migration evidence

## Result and gap summary

The successful September 17 full run processed all 468 projects at the pinned specs commit; 462 are assessable. Swagger reported 679 diagnostics and TypeSpec 705 across the same 37 projects, with no one-sided projects. The +26 net difference consists of 27 native findings on older-version operations (20 ContainerApps, 7 ContainerInstance) and one Swagger-only ARM operations-template finding in Datadog. Saved selected-version HTTP projections confirm that the 27 findings are absent from those projects' selected versions.

The empty-string fix is retained; no further production change is required. Fifteen compiler-only native tests pass, including distinct alias and instantiated-source targets. The value-comparison predicate is equivalent for supported operation metadata, not a promise of identical Swagger diagnostic populations. Native template traversal and library-location filtering are explicit differences. The six failed projects remain excluded from both sides; this run does not establish behavior for them.

## Conclusion

A TypeSpec rule change was required and completed for the empty-string branch. The native rule inspects TypeSpec `Operation` declarations, reads `@summary` with `getSummary`, reads operation documentation with `getDoc`, skips missing or empty values to match the Swagger function's `op.summary && op.description` precondition, trims both remaining strings, and reports when they are equal. That matches the material Swagger rule behavior for authorable operation-level `summary` and `description` fields.

Functional equivalence of the metadata check is based on six comparison fixtures, fifteen compiler-only native tests, the direct compiler metadata APIs, and the explained corpus outliers. It does not imply identical diagnostic targets or counts: Swagger visits emitted HTTP operations for the selected version, whereas native lint visits semantic operations, including a concrete alias's instantiated source. The compiler's lint context excludes diagnostics whose targets belong to imported libraries.

## Rule mapping

| Item                    | Value                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Swagger validator rule  | `SummaryAndDescriptionMustNotBeSame`                                                                                                                                                                                                                                                                                                                                                       |
| TypeSpec lint rule      | `tsp-lintdiff-local-linter/summary-and-description-must-not-be-same`                                                                                                                                                                                                                                                                                                                       |
| TypeSpec implementation | `packages/typespec-lintdiff/src/rules/summary-and-description-must-not-be-same.ts`                                                                                                                                                                                                                                                                                                         |
| Fixture metadata        | `packages/typespec-lintdiff/test/fixtures/SummaryAndDescriptionMustNotBeSame/rule.md`                                                                                                                                                                                                                                                                                                      |
| Swagger rule source     | [`az-common.ts`](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/az-common.ts), [`summary-description-must-not-be-same.ts`](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/functions/summary-description-must-not-be-same.ts) |
| Swagger rule docs       | [`summary-and-description-must-not-be-same.md`](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/docs/summary-and-description-must-not-be-same.md), [`R2023`](https://github.com/Azure/azure-rest-api-specs/blob/1d8c5c7146e96156f626703fbe0b5b897c5437b9/documentation/openapi-authoring-automated-guidelines.md#r2023)                     |

## Source rule behavior

The Swagger Spectral ruleset config uses `given: "$[paths,'x-ms-paths'].*.*"`, `resolved: false`, and delegates each emitted operation object to `checkSummaryAndDescription`. The function reports a warning at the operation JSON path only when `op.summary` and `op.description` are both truthy and `op.summary.trim() === op.description.trim()`.

The migrated TypeSpec rule checks the same authorable operation concept: operation-level summary and documentation. It intentionally does not inspect emitted OpenAPI or Swagger-only artifacts. The compiler walker visits an operation's `sourceOperation` after the operation itself (`core/packages/compiler/src/core/semantic-walker.ts:232-247`). Thus a project-defined operation template and its concrete alias can yield two findings at distinct source locations. The rule does not deduplicate those distinct semantic targets into one emitted endpoint.

Library exclusion is supplied by `createLinterRuleContext` (`core/packages/compiler/src/core/linter.ts:387-395`), which collects only diagnostics whose location context is `project`; no private library state or emitter dependency is used.

## Report reconciliation

| Report                        | Source revision / generation                                                                                                                                                                                                                    | Population                                                                                                           | Row for this rule                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/coverage_old.md`        | External gist snapshot, source `https://gist.github.com/catalinaperalta/b2e7d29a33b4b451bcfcc87e8314565a`; aggregate report lists 450 compiled projects and 210 validator rules.                                                                | Mixed coverage-credit report: local lint plus official/no-action classifications.                                    | 34 validator projects, 34 local lint projects, 0 official projects, 100.0% coverage. Raw per-project lists are not available in this aggregate. |
| `specs/coverage-breakdown.md` | Checked-in artifact generated `2026-08-10T09:38:18.108Z`. Its rule row was independently reproduced by the successful current-source full run generated `2026-09-17T03:06:50.884Z`, using an isolated complete copy of the same pinned dataset. | Observed same-project overlap only; official mappings do not get credit unless diagnostics fire in the same project. | 37 validator projects, 37 TypeSpec projects, 37 overlap, 0 gaps, 0 TypeSpec-only projects, 679 validator diagnostics, 705 TypeSpec diagnostics. |

The cross-report project-count difference is explained by different report snapshots and definitions: the older external report used a 450-project population and coverage-credit accounting; the local report used the pinned 468-project dataset, excluded 6 comparison-unassessed projects, and counted only same-project diagnostic overlap.

## Comparable population

- Specs commit: `f6b53f105b95da05276530a0754a1c71b4f16397`.
- Full corpus command: `mise exec -- pnpm --dir packages/typespec-lintdiff specs:typespec --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-summary-and-description-must-not-be-same --concurrency 6 --output <isolated-copy-of-specs-dataset>`.
- The isolated input was a complete 76,313-file copy; all 468 project entries and metadata hashes matched. `--output` selects the runner's dataset input/output root, not a project filter. No `--filter` or `--limit` was supplied.
- Current-source run: source commit `725ad70d24f16b4c10bd410fb2afb25ca248b12f`, local-linter fingerprint `sha256:35105729658d3638d35b339e9e6635b20120c15f94ea8e3d44fdf979e782b2e1`, Node `26.5.0`, pnpm `11.10.0`. Started `2026-09-17T10:46:59+08:00`, finished `2026-09-17T11:09:26+08:00`, exit **0**, elapsed **22m27s**. Metadata records `partial: false`, `sourceProjectCount: 468`, and `projectCount: 468`.
- Finalized metadata, rule shards, project outputs, and comparison/coverage reports are retained in the isolated dataset; generated data is not part of this PR. Subsequent changes are tests/documentation only and do not change the production fingerprint.
- Comparison result: 462 successful assessable projects from 468 discovered projects.
- Comparison failures/unassessed projects:
- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

The rule-specific included population has no one-sided projects.

### Preserved historical failure

The earlier post-fix run began September 11 and exited **1** on September 14 after 467/468 completions. The missing project was SerialConsole: its auxiliary selected-version projection child rejected, aborting final aggregation. The historical log jumps from elapsed 16m45s to 3488m3s; interruption or timeout is plausible, but its exact termination mechanism was not retained. That failed run and the earlier literal empty-summary search are not used as current-source validation.

In the successful September 17 run, SerialConsole completed with 62 diagnostics and its selected-version HTTP graph was written. All 468 projects have final records. The six ordinary compile failures listed above are retained explicitly rather than silently omitted.

## Project-set comparison

| Set                  | Count | Projects                   |
| -------------------- | ----: | -------------------------- |
| Validator projects   |    37 | Same as overlap list below |
| TypeSpec projects    |    37 | Same as overlap list below |
| Same-project overlap |    37 | Listed below               |
| Validator-only       |     0 | None                       |
| TypeSpec-only        |     0 | None                       |

### Overlap projects

- `specification/advisor/resource-manager/Microsoft.Advisor/Advisor`
- `specification/app/resource-manager/Microsoft.App/ContainerApps`
- `specification/azurearcdata/resource-manager/Microsoft.AzureArcData/AzureArcData`
- `specification/billing/resource-manager/Microsoft.Billing/Billing`
- `specification/cognitiveservices/CognitiveServices.Management`
- `specification/confluent/resource-manager/Microsoft.Confluent/Confluent`
- `specification/containerinstance/resource-manager/Microsoft.ContainerInstance/ContainerInstance`
- `specification/databoxedge/resource-manager/Microsoft.DataBoxEdge/DataBoxEdge`
- `specification/datadog/resource-manager/Microsoft.Datadog/Datadog`
- `specification/dataprotection/resource-manager/Microsoft.DataProtection/DataProtection`
- `specification/developerhub/resource-manager/Microsoft.DevHub/DeveloperHub`
- `specification/domainregistration/resource-manager/Microsoft.DomainRegistration/DomainRegistration`
- `specification/dynatrace/resource-manager/Dynatrace.Observability/DynatraceObservability`
- `specification/elastic/resource-manager/Microsoft.Elastic/Elastic`
- `specification/elasticsan/resource-manager/Microsoft.ElasticSan/ElasticSan`
- `specification/frontdoor/resource-manager/Microsoft.Network/FrontDoor`
- `specification/liftrcommvault/Commvault.ContentStore.Management`
- `specification/machinelearningservices/MachineLearningServices.Management`
- `specification/maintenance/resource-manager/Microsoft.Maintenance/Maintenance`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/DataCollectionApi`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/NetworkSecurityPerimeterApi`
- `specification/mysql/resource-manager/Microsoft.DBforMySQL/FlexibleServers`
- `specification/napster/Napster.CompanionAPI.Management`
- `specification/newrelic/NewRelicObservability.Management`
- `specification/notificationhubs/resource-manager/Microsoft.NotificationHubs/NotificationHubs`
- `specification/purview/resource-manager/Microsoft.Purview/Purview`
- `specification/recoveryservices/resource-manager/Microsoft.RecoveryServices/RecoveryServices`
- `specification/recoveryservicesbackup/resource-manager/Microsoft.RecoveryServices/RecoveryServicesBackup`
- `specification/recoveryservicessiterecovery/resource-manager/Microsoft.RecoveryServices/SiteRecovery`
- `specification/reservations/resource-manager/Microsoft.Capacity/Reservations/Reservations`
- `specification/resourceconnector/resource-manager/Microsoft.ResourceConnector/ResourceConnector`
- `specification/resources/resource-manager/Microsoft.Resources/resources`
- `specification/security/resource-manager/Microsoft.Security/Security/SecurityConnectorsDevOpsAPI`
- `specification/security/resource-manager/Microsoft.Security/Security/SqlVulnerabilityAssessmentsAPI`
- `specification/servicefabric/resource-manager/Microsoft.ServiceFabric/ServiceFabric`
- `specification/servicefabricmanagedclusters/resource-manager/Microsoft.ServiceFabric/ServiceFabricManagedClusters`
- `specification/web/resource-manager/Microsoft.Web/AppService`

## Diagnostic cardinality

| Identity                 | Validator | TypeSpec |   Difference |
| ------------------------ | --------: | -------: | -----------: |
| Included raw diagnostics |       679 |      705 | +26 TypeSpec |
| Project count            |        37 |       37 |            0 |

Conservative deduplication over the same 462-project population gives:

| Identity                                              | Diagnostics |
| ----------------------------------------------------- | ----------: |
| Validator: project + Swagger file + JSON path         |         679 |
| Validator: project + JSON path, ignoring Swagger file |         679 |
| TypeSpec: project + source file + line + column       |         705 |

Of the 37 affected projects, **34 have equal counts**, **2 are TypeSpec-higher** (total **+27**), and **1 is validator-higher** (total **-1**). Before excluding unassessed projects, the shards contain 1,039 validator and 729 TypeSpec findings; the unassessed Network project contributes 360 and 24 respectively.

No cross-engine canonical identity was added. Swagger paths and TypeSpec source locations remain different domains; equal deduplicated counts do not establish one-to-one equivalence.

Major included outliers:

| Project                                                                                          | Validator diagnostics | TypeSpec diagnostics | Explanation                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------ | --------------------: | -------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `specification/app/resource-manager/Microsoft.App/ContainerApps`                                 |                    83 |                  103 | Saved `2026-01-01` HTTP projection retains 83 of the 103 native locations. The other 20 belong to operations or interfaces marked `@removed(Versions.v2026_01_01)`.                                                                     |
| `specification/containerinstance/resource-manager/Microsoft.ContainerInstance/ContainerInstance` |                     7 |                   14 | TypeSpec reports `SandboxGroups` operations from `2026-06-01-preview` even though they are removed before selected Swagger version `2026-08-01-preview`; latest Swagger contains the replacement `AiAgentsGroups` operations only.      |
| `specification/datadog/resource-manager/Microsoft.Datadog/Datadog`                               |                    33 |                   32 | Swagger includes one ARM template-emitted `/providers/Microsoft.Datadog/operations` operation whose summary and description are generated from the template; there is no authored service operation requiring a native lint diagnostic. |

The unassessed `specification/network/resource-manager/Microsoft.Network/Network/Network` project has 360 validator and 24 TypeSpec raw rule results in per-rule files, but it is excluded from the behavioral comparison because the comparison harness marked it unassessed.

Selected-version attribution was performed for the two TypeSpec-higher outliers, not as a new global filtering policy. Their saved HTTP graphs retain 83/103 ContainerApps findings and 7/14 ContainerInstance findings, accounting for all 27 positive-delta findings. The native rule still reports the older-version declarations.

## Fixture evidence

Focused validation command: `pnpm --dir packages/typespec-lintdiff validate --rule SummaryAndDescriptionMustNotBeSame`.

Result after the empty-string parity fix: 6/6 fixtures passed.

| Fixture                          | Expected behavior                                                               | Result                           |
| -------------------------------- | ------------------------------------------------------------------------------- | -------------------------------- |
| `same-summary-description`       | Violation when `@summary("List widgets")` and `@doc("List widgets")` are equal. | Covered by Swagger and TypeSpec. |
| `same-after-trimming-whitespace` | Violation when values only differ by surrounding whitespace.                    | Covered by Swagger and TypeSpec. |
| `different-summary-description`  | Compliance when summary and description differ.                                 | No mapped TypeSpec diagnostic.   |
| `summary-only`                   | Compliance when only summary is present.                                        | No mapped TypeSpec diagnostic.   |
| `description-only`               | Compliance when only description is present.                                    | No mapped TypeSpec diagnostic.   |
| `empty-summary-description`      | Compliance when both metadata values are empty strings.                         | No mapped TypeSpec diagnostic.   |

The validation output labels all four compliant fixtures' ambient proof as unreviewed. Their snapshots contain only the unrelated `xms-examples-required` warning, plus `descriptive-description-required` for the empty-doc fixture. Neither warning is an execution failure or a diagnostic from this rule. The compiler-only tests below independently prove compliance without either ambient rule; no compiler diagnostics are allowed by the test helper. The historical `audit:noise` run is supporting evidence only: its implementation scans all violation fixtures and does not honor a `--rule` filter.

Native validation: `mise exec -- pnpm --dir packages/typespec-lintdiff exec vitest run test/rules/summary-and-description-must-not-be-same.test.ts` — **15/15 passed**. The test host registers no libraries and fails if the AutoRest emitter is imported. Cases cover equal/trimmed text, doc comments, case/punctuation differences, either/both/neither metadata field, either/both empty strings, a concrete template alias and its instantiated source at distinct locations, inherited interface operations in nested namespaces, and non-operation model/property controls. See the [native metadata matrix](rule.md#native-metadata-matrix).

## Gap example: direct authored operation parity

- **Classification:** same-project overlap
- **Status:** covered
- **Project/API version:** `specification/advisor/resource-manager/Microsoft.Advisor/Advisor` / `2026-03-01-preview`
- **Source:** `routes.tsp`, `Recommendations_Generate`

**TypeSpec source**

```typespec
/**
 * Initiates the recommendation generation or computation process for a subscription. This operation is asynchronous. The generated recommendations are stored in a cache in the Advisor service.
 */
@summary("Initiates the recommendation generation or computation process for a subscription. This operation is asynchronous. The generated recommendations are stored in a cache in the Advisor service.")
@route("/subscriptions/{subscriptionId}/providers/Microsoft.Advisor/generateRecommendations")
@post
generate(...): ArmAcceptedResponse<...> | ArmDefaultErrorResponse;
```

**Emitted OpenAPI or validator behavior**

```json
"post": {
  "operationId": "Recommendations_Generate",
  "summary": "Initiates the recommendation generation or computation process for a subscription. This operation is asynchronous. The generated recommendations are stored in a cache in the Advisor service.",
  "description": "Initiates the recommendation generation or computation process for a subscription. This operation is asynchronous. The generated recommendations are stored in a cache in the Advisor service."
}
```

| Engine            | Observed result                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Reports `SummaryAndDescriptionMustNotBeSame` because emitted `summary` and `description` trim to the same value.                                              |
| TypeSpec lint     | Reports `tsp-lintdiff-local-linter/summary-and-description-must-not-be-same` on the operation because `getSummary` and `getDoc` return equal trimmed strings. |

**Explanation:** This is the native contract: the authored operation carries identical summary and documentation text, and both engines diagnose it.

**Disposition:** Covered; no production change.

## Gap example: TypeSpec-only raw diagnostics from older API versions

- **Classification:** count-only
- **Status:** population mismatch
- **Project/API version:** `specification/containerinstance/resource-manager/Microsoft.ContainerInstance/ContainerInstance` / selected Swagger `2026-08-01-preview`
- **Source:** `SandboxGroup.tsp`

**TypeSpec source**

```typespec
@armResourceOperations
@added(Versions.v2026_06_01_preview)
@removed(Versions.v2026_08_01_preview)
interface SandboxGroups {
  /**
   * List SandboxGroup resources by subscription ID
   */
  @summary("List SandboxGroup resources by subscription ID")
  listBySubscription is ArmListBySubscription<SandboxGroup, Error = CloudError>;
}
```

**Emitted OpenAPI or validator behavior**

The selected latest Swagger file is `preview/2026-08-01-preview/containerInstance.json`. It contains the replacement `AiAgentsGroups` operation:

```json
"/subscriptions/{subscriptionId}/providers/Microsoft.ContainerInstance/aiAgentsGroups": {
  "get": {
    "operationId": "AiAgentsGroups_ListBySubscription",
    "summary": "List AiAgentsGroup resources by subscription ID",
    "description": "List AiAgentsGroup resources by subscription ID"
  }
}
```

| Engine            | Observed result                                                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Reports the selected-version `AiAgentsGroups` operation, not the removed `SandboxGroups` operation.                                                                                                                   |
| TypeSpec lint     | Reports both the removed older-version `SandboxGroups` operations and the selected-version `AiAgentsGroups` operations in the unprojected program, giving 14 raw TypeSpec diagnostics versus 7 validator diagnostics. |

**Explanation:** The raw count includes TypeSpec diagnostics from older API-version declarations that are not present in the selected latest Swagger file. This is a comparison population issue, not a semantic miss.

**Disposition:** Intentional comparison difference; no rule change.

### ContainerApps attribution for the same version-population cause

The selected version is `2026-01-01`. For example, `ContainerAppsSessionPool.tsp:80-89` contains:

```typespec
  /**
   * Fetch the MCP server credentials of a session pool.
   */
  @summary("Fetch the MCP server credentials of a session pool.")
  @removed(Versions.v2026_01_01)
  fetchMcpServerCredentials is ArmResourceActionSync<
    SessionPool,
    void,
    ArmResponse<McpServerCredential>
  >;
```

The saved `2026-01-01` HTTP graph excludes this native diagnostic location; the operation is removed before the selected Swagger comparison. All 20 excluded locations are in these removed operations/interfaces:

| Source                                                                 | Excluded findings |
| ---------------------------------------------------------------------- | ----------------: |
| `ContainerAppsSessionPool.tsp`: fetch/rotate MCP credentials           |                 2 |
| `ContainerAppsFunction.tsp`: `ContainerAppsFunctions`                  |                 4 |
| `Revision.tsp`: `FunctionsExtension`                                   |                 1 |
| `LabelHistory.tsp`: `ContainerAppsLabelHistory`                        |                 3 |
| `DotNetComponent.tsp`: `DotNetComponents`                              |                 3 |
| `LogicApp.tsp`: `invoke`                                               |                 1 |
| `DaprComponentResiliencyPolicy.tsp`: `DaprComponentResiliencyPolicies` |                 2 |
| `DaprSubscription.tsp`: `DaprSubscriptions`                            |                 2 |
| `Job.tsp`: `resume` and `suspend`                                      |                 2 |

**Disposition:** Same older-version population cause as SandboxGroups; no missing native check.

## Gap example: Swagger-only ARM operations template output

- **Classification:** count-only
- **Status:** intentional native-contract difference
- **Project/API version:** `specification/datadog/resource-manager/Microsoft.Datadog/Datadog` / `2025-12-26-preview`
- **Source:** `main.tsp`, `interface Operations extends Azure.ResourceManager.Legacy.Operations<...>`

**TypeSpec source**

```typespec
/**
 * This is the interface that implements the standard Azure Resource Manager operation that returns
 * all supported RP operations. You should have exactly one declaration for each
 * Azure Resource Manager service. It implements
 *   GET "/providers/Microsoft.ContosoProviderHub/operations"
 */
interface Operations
  extends Azure.ResourceManager.Legacy.Operations<
      ArmResponse<OperationListResult>,
      ErrorResponse
    > {}
```

**Emitted OpenAPI or validator behavior**

```json
"/providers/Microsoft.Datadog/operations": {
  "get": {
    "operationId": "Operations_List",
    "summary": "List all operations provided by Microsoft.Datadog for the 2025-06-11 api version.",
    "description": "List all operations provided by Microsoft.Datadog for the 2025-06-11 api version."
  }
}
```

| Engine            | Observed result                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Reports one emitted `/operations` operation whose generated summary and description match.                                                                                       |
| TypeSpec lint     | Does not report a service-authored operation for that generated ARM template member; it reports 32 authored Datadog operations instead of the validator's 33 emitted operations. |

**Explanation:** The compiler's lint context filters targets located in imported libraries. The inherited ARM operations member has no project-authored operation declaration to diagnose, whereas Swagger validates its emitted summary/description pair. This is a library/source-versus-emitted population difference, not a reason to inspect generated Swagger in the native rule.

**Disposition:** Intentional native-contract difference; no production change.

## Native target example: project-defined operation template

The compiler-only regression uses:

```typespec
@summary("Read widgets")
@doc("Read widgets")
op ReadWidgets<T>(): T;
op read is ReadWidgets<string>;
```

Both the concrete `read` alias and its distinct instantiated `ReadWidgets` source carry equal nonempty metadata. The compiler walker visits both semantic objects; native lint reports each at its own source location. The test asserts the alias/source names, distinct identities, and exact file/start/end locations. An HTTP emitter exposes the concrete endpoint rather than an extra endpoint for that template source, so this is another explicit native target-population difference. No claim of equal diagnostic cardinality is made for this shape, and the production rule is not changed merely to satisfy the initial one-diagnostic test assumption.

## Required TypeSpec changes

Completed:

- Updated `packages/typespec-lintdiff/src/rules/summary-and-description-must-not-be-same.ts` so empty summary or description values are skipped before the trim/equality comparison, matching the Swagger rule's truthy check.
- Added `empty-summary-description` as a compliant regression fixture.

The rule implementation and fixtures now cover the authorable upstream matrix:

- both fields present and exactly equal after trimming: violation
- equality only after surrounding whitespace trimming: violation
- either field is the empty string: compliant
- different text: compliant
- only `summary` or only `description`: compliant

## Remaining uncertainty

The metadata predicate and the tested supported native shapes are established without an emitter dependency. The 27 positive-delta findings are attributed using saved selected-version graphs, and the Datadog difference is documented separately. Exact Swagger population equivalence is not claimed: native alias/source traversal, library exclusion, and all-version authoring differ from selected-version emitted operations. Six failed projects remain outside the assessed population; complete corpus overlap is observational evidence, not proof for every possible authoring shape.
