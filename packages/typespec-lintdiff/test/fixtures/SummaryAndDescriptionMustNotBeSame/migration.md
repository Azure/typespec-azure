# SummaryAndDescriptionMustNotBeSame migration evidence

## Result and gap summary

The latest successful full lintdiff corpus evidence at specs commit `f6b53f105b95da05276530a0754a1c71b4f16397` compared 462 assessable projects out of 468 discovered projects. `SummaryAndDescriptionMustNotBeSame` fired in 37 validator projects and the migrated TypeSpec lint fired in the same 37 projects: 37 overlap, 0 validator-only, and 0 TypeSpec-only projects. Raw included diagnostic counts differ by +26 TypeSpec diagnostics (679 Swagger validator diagnostics versus 705 TypeSpec diagnostics). The difference is not a missed project or missing semantic check: sampled outliers show TypeSpec reports authoring-time operations from older API versions that are not present in the selected latest Swagger file, while one validator-only emitted operation comes from the ARM operations template rather than an authored service operation. After the empty-string fix, a focused corpus-impact search found no authored `@summary("")` declarations under the supplied specs `specification` tree, so this parity fix does not change the observed successful corpus row. A small production rule update was completed to match the Swagger function's truthy precondition for empty strings; after that fix, the TypeSpec rule is functionally equivalent for supported authored operation summary/doc semantics, with raw-count differences explained below.

## Conclusion

A TypeSpec rule change was required and completed for the empty-string branch. The native rule inspects TypeSpec `Operation` declarations, reads `@summary` with `getSummary`, reads operation documentation with `getDoc`, skips missing or empty values to match the Swagger function's `op.summary && op.description` precondition, trims both remaining strings, and reports when they are equal. That matches the material Swagger rule behavior for authorable operation-level `summary` and `description` fields.

Functional equivalence is based on matching project coverage, focused fixtures, and sampled outlier explanations. It does not depend on raw diagnostic equality because the Swagger validator reports emitted OpenAPI operations for the selected Swagger files while TypeSpec lint reports semantic source operations across the compiled TypeSpec program.

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

The migrated TypeSpec rule checks the same authorable operation concept: operation-level summary and documentation. It intentionally does not inspect emitted OpenAPI, template-generated operations without an authored operation declaration, or Swagger-only artifacts.

## Report reconciliation

| Report                        | Source revision / generation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Population                                                                                                           | Row for this rule                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/coverage_old.md`        | External gist snapshot, source `https://gist.github.com/catalinaperalta/b2e7d29a33b4b451bcfcc87e8314565a`; aggregate report lists 450 compiled projects and 210 validator rules.                                                                                                                                                                                                                                                                                                                                                                                                     | Mixed coverage-credit report: local lint plus official/no-action classifications.                                    | 34 validator projects, 34 local lint projects, 0 official projects, 100.0% coverage. Raw per-project lists are not available in this aggregate. |
| `specs/coverage-breakdown.md` | Checked-in restored artifact generated `2026-08-10T09:38:18.108Z`; a local full rerun before the empty-string fix produced the same rule row before generated corpus data was restored out of the PR. A post-fix full rerun was attempted but failed late in unrelated project projection workers after 467/468 projects, so it is not cited as canonical coverage. A post-fix search found no `@summary("")` declarations under the supplied specs `specification` tree. Specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`; full successful row, 462/468 assessable projects. | Observed same-project overlap only; official mappings do not get credit unless diagnostics fire in the same project. | 37 validator projects, 37 TypeSpec projects, 37 overlap, 0 gaps, 0 TypeSpec-only projects, 679 validator diagnostics, 705 TypeSpec diagnostics. |

The cross-report project-count difference is explained by different report snapshots and definitions: the older external report used a 450-project population and coverage-credit accounting; the local report used the pinned 468-project dataset, excluded 6 comparison-unassessed projects, and counted only same-project diagnostic overlap.

## Comparable population

- Specs commit: `f6b53f105b95da05276530a0754a1c71b4f16397`.
- Full corpus command: `pnpm --dir packages/typespec-lintdiff specs:typespec --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-summary-and-description-must-not-be-same --concurrency 6`. A post-fix rerun of the same command failed late in unrelated projection workers; generated artifacts were restored and not committed.
- Comparison result: 462 successful assessable projects from 468 discovered projects.
- Comparison failures/unassessed projects:
- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

The rule-specific included population has no one-sided projects.

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

No rule-specific canonical identity was added. The enforced concept is one operation with both text fields present and equal after trimming, but Swagger and TypeSpec diagnostics use different stable identities: Swagger uses emitted file plus JSON path, while TypeSpec uses source file plus line and column. Project overlap and targeted outlier inspection are the appropriate equivalence evidence.

Major included outliers:

| Project                                                                                          | Validator diagnostics | TypeSpec diagnostics | Explanation                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------ | --------------------: | -------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `specification/app/resource-manager/Microsoft.App/ContainerApps`                                 |                    83 |                  103 | TypeSpec reports additional authored operations from non-selected API-version declarations; selected Swagger comparison uses `2026-01-01`.                                                                                              |
| `specification/containerinstance/resource-manager/Microsoft.ContainerInstance/ContainerInstance` |                     7 |                   14 | TypeSpec reports `SandboxGroups` operations from `2026-06-01-preview` even though they are removed before selected Swagger version `2026-08-01-preview`; latest Swagger contains the replacement `AiAgentsGroups` operations only.      |
| `specification/datadog/resource-manager/Microsoft.Datadog/Datadog`                               |                    33 |                   32 | Swagger includes one ARM template-emitted `/providers/Microsoft.Datadog/operations` operation whose summary and description are generated from the template; there is no authored service operation requiring a native lint diagnostic. |

The unassessed `specification/network/resource-manager/Microsoft.Network/Network/Network` project has 360 validator and 24 TypeSpec raw rule results in per-rule files, but it is excluded from the behavioral comparison because the comparison harness marked it unassessed.

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

The validation output notes unrelated `xms-examples-required` ambient diagnostics in validator-clean compliant fixtures, but no mapped `summary-and-description-must-not-be-same` diagnostic appears in those compliant cases.

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

**Explanation:** The native lint rule is intended to validate service-authored operation summary/documentation pairs. Recreating template-generated OpenAPI text would require checking emitted Swagger rather than TypeSpec semantics and is outside the native implementation boundary.

**Disposition:** Intentional native-contract difference; no production change.

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

No unresolved rule-semantic uncertainty remains for supported authored operations after the empty-string branch was fixed and validated. Raw diagnostic cardinality remains non-equal because of version population and template-generated emitted operations, but all same-project coverage is present and the sampled count-only causes do not require a native rule update.
