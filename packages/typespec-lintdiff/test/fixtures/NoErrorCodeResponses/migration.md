# NoErrorCodeResponses migration

## Result and gap summary

The latest full production corpus run at specs commit `f6b53f105b95da05276530a0754a1c71b4f16397` compiled 462 of 468 projects. `NoErrorCodeResponses` fired in 20 validator projects and the migrated TypeSpec rule fired in the same 20 projects: 20/20 overlap, 0 validator-only projects, 0 TypeSpec-only projects, 100.0% observed project coverage. Raw diagnostics remain non-equal: the validator reports 144 selected Swagger response-key diagnostics while TypeSpec reports 146 selected diagnostics. The +2 TypeSpec count is explained by source/template expansion differences in `deploymentStacks` and `Solutions.Management`, not by unmatched projects. A TypeSpec rule update was required and completed: the local rule now uses ancestor-aware ARM provider detection so operations declared in nested provider namespaces are checked. Functional equivalence is supported for valid ARM TypeSpec authoring despite raw-count inequality.

## Coverage classification

- **Worker existing TypeSpec coverage classification:** `gap`.
- **Official evidence:** `@azure-tools/typespec-azure-core/no-error-status-codes` documents a LintDiff equivalent, and the ARM ruleset enables it, but its implementation returns early unless the operation namespace name starts with `Azure.`. ARM services in the corpus use provider namespaces such as `Microsoft.*`, so this official rule does not enforce the validator behavior for ARM service operations. `@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes` catches some POST cases but does not cover every method, custom response status, or nested provider-namespace operation.
- **Implemented rule:** `tsp-lintdiff-local-linter/no-error-code-responses` checks HTTP operation responses in ARM provider namespaces and reports every response status outside `200`, `201`, `202`, `204`, and `default`, including grouped/ranged status codes such
  as `3XX`.

## Source-of-truth rule behavior

- Validator ruleset entry: `packages/rulesets/src/spectral/az-arm.ts` rule `NoErrorCodeResponses`, `given: ["$.paths.*.*.responses.*~"]`.
- Validator function: `packages/rulesets/src/spectral/functions/no-error-code-responses.ts`.
- Validator source link: [NoErrorCodeResponses](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/no-error-code-responses.ts).
- Validator doc link: [openapi-authoring-automated-guidelines.md](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md).

The Swagger validator receives every response object key for every operation under `paths` and `x-ms-paths`. It returns no diagnostic only when the key is exactly `200`, `201`, `202`, `204`, or `default`; every other string response key is reported at that response key path. The native TypeSpec contract is therefore an ARM HTTP operation response-status check, not an emitter simulation. The TypeSpec implementation uses `getHttpOperation` and `getArmProviderNamespace`; it does not import emitters, `@typespec/openapi`, TCGC, or unsafe compiler mutation.

## Report reconciliation

| Report                        | Snapshot / scope                                          | Row    | Validator projects | Local TypeSpec projects |                     Official credited |        Overlap | One-sided projects                        | Raw diagnostics             |
| ----------------------------- | --------------------------------------------------------- | ------ | -----------------: | ----------------------: | ------------------------------------: | -------------: | ----------------------------------------- | --------------------------- |
| `docs/coverage_old.md`        | external gist, 450 compiled projects, 210 validator rules | `lint` |                 20 |                      20 |                                     0 | aggregate only | not reconstructable from aggregate report | not listed in row           |
| `specs/coverage-breakdown.md` | full local production run, 462/468 compiled projects      | `lint` |                 20 |                      20 | context only (`officialMapping: yes`) |             20 | 0 validator-only, 0 TypeSpec-only         | validator 144, TypeSpec 146 |

The reports use different snapshots and definitions. `coverage_old.md` asks whether each validator firing has some migration disposition and gives aggregate rows; `coverage-breakdown.md` credits only observed same-project TypeSpec diagnostics in successfully compiled projects.

## Full corpus evidence

- Specs commit: `f6b53f105b95da05276530a0754a1c71b4f16397`.
- Run: full `specs:typespec --concurrency 6`, generated at `2026-09-14T03:27:12.548Z`.
- Scope: 468 source projects; 462 compiled successfully; 6 compile failures are excluded from both sides of the behavioral comparison.
- Compile failures: `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`, `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`, `specification/network/resource-manager/Microsoft.Network/Network/Network`, `specification/quota/resource-manager/Microsoft.Quota/Quota`, `specification/resources/resource-manager/Microsoft.Resources/deployments`, `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`.
- Validator projects: `specification/advisor/resource-manager/Microsoft.Advisor/Advisor`, `specification/apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement`, `specification/app/resource-manager/Microsoft.App/ContainerApps`, `specification/automation/Automation.Management`, `specification/billingbenefits/resource-manager/Microsoft.BillingBenefits/BillingBenefits`, `specification/cosmos-db/resource-manager/Microsoft.DocumentDB/DocumentDB`, `specification/datafactory/resource-manager/Microsoft.DataFactory/DataFactory`, `specification/domainregistration/resource-manager/Microsoft.DomainRegistration/DomainRegistration`, `specification/hdinsight/resource-manager/Microsoft.HDInsight/HDInsight`, `specification/iothub/resource-manager/Microsoft.Devices/IoTHub`, `specification/monitor/resource-manager/Microsoft.Insights/Insights/ActionGroupsApi`, `specification/operationalinsights/resource-manager/Microsoft.OperationalInsights/OperationalInsights`, `specification/paloaltonetworks/resource-manager/PaloAltoNetworks.Cloudngfw/Cloudngfw`, `specification/resources/resource-manager/Microsoft.Resources/deploymentStacks`, `specification/resources/resource-manager/Microsoft.Resources/resources`, `specification/search/resource-manager/Microsoft.Search/Search`, `specification/serialconsole/resource-manager/Microsoft.SerialConsole/SerialConsole`, `specification/solutions/Solutions.Management`, `specification/storagecache/resource-manager/Microsoft.StorageCache/StorageCache`, `specification/web/resource-manager/Microsoft.Web/AppService`.
- TypeSpec projects: same 20 projects.
- Validator-only projects: none.
- TypeSpec-only projects: none.
- Selected-latest-version TypeSpec population: the local comparison row reports the same 20 projects after projection to the retained Swagger population; no one-sided latest-version diagnostic requires a production-rule change.

## Diagnostic cardinality

| Identity                          | Validator | TypeSpec | Notes                                                       |
| --------------------------------- | --------: | -------: | ----------------------------------------------------------- |
| Coverage-row selected diagnostics |       144 |      146 | Latest full production comparison row.                      |
| Rule shard raw file diagnostics   |       155 |      157 | Raw by-rule files before coverage selection; same +2 delta. |
| Project count                     |        20 |       20 | Exact same project set.                                     |

Raw counts are not required to match because the validator reports emitted OpenAPI response-key occurrences while TypeSpec reports semantic operation/template instantiations. The only per-project selected raw-count differences are `deploymentStacks` (+1 TypeSpec) and `Solutions.Management` (+1 TypeSpec); all other overlap projects have equal counts.

## Gap examples

### Gap example: nested provider namespace previously skipped

- **Classification:** TypeSpec miss fixed by production rule change
- **Status:** fixed
- **Project/API version:** focused fixture `NoErrorCodeResponses/nested-provider-namespace` / `2024-01-01`
- **Source:** `packages/typespec-lintdiff/test/fixtures/NoErrorCodeResponses/nested-provider-namespace/main.tsp`

**TypeSpec source**

```typespec
@armProviderNamespace
namespace Microsoft.TestService;

namespace Nested {
  @armResourceOperations
  interface Widgets {
    @post
    @armResourceAction(Widget)
    redirect(...ResourceInstanceParameters<Widget>): ArmResponse<Widget> | RedirectResponse;
  }
}

model RedirectResponse {
  @statusCode statusCode: 302;
  @header("Location") location: string;
}
```

**Emitted OpenAPI or validator behavior**

```json
{
  "paths": {
    "/redirect/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}/redirect": {
      "post": { "responses": { "200": {}, "302": {} } }
    }
  }
}
```

| Engine            | Observed result                                                                     |
| ----------------- | ----------------------------------------------------------------------------------- |
| Swagger validator | `NoErrorCodeResponses` at `responses/302` because `302` is outside the allowed set. |
| TypeSpec lint     | `tsp-lintdiff-local-linter/no-error-code-responses` on operation `redirect`.        |

**Explanation:** `resolveProviderNamespace(program, nestedNamespace)` searches descendants, not ancestors, so a nested namespace under an ARM provider was skipped. `getArmProviderNamespace` walks ancestors and recognizes the provider boundary.

**Disposition:** Rule fixed and covered by fixture validation.

### Gap example: default error response compliant control

- **Classification:** compliant control
- **Status:** intentional no-diagnostic behavior
- **Project/API version:** focused fixture `NoErrorCodeResponses/default-error-response` / `2024-01-01`
- **Source:** `packages/typespec-lintdiff/test/fixtures/NoErrorCodeResponses/default-error-response/main.tsp`

**TypeSpec source**

```typespec
@post
@armResourceAction(Widget)
check(...ResourceInstanceParameters<Widget>): ArmResponse<Widget> | Azure.ResourceManager.CommonTypes.ErrorResponse;
```

**Emitted OpenAPI or validator behavior**

```json
{
  "responses": {
    "200": { "schema": { "$ref": "#/definitions/Widget" } },
    "default": {
      "schema": {
        "$ref": "common-types/resource-management/v5/types.json#/definitions/ErrorResponse"
      }
    }
  }
}
```

| Engine            | Observed result                                                                    |
| ----------------- | ---------------------------------------------------------------------------------- |
| Swagger validator | No `NoErrorCodeResponses` diagnostic because only `200` and `default` are present. |
| TypeSpec lint     | No mapped diagnostic; reviewed ambient diagnostics are unrelated rules.            |

**Explanation:** The native rule checks response status keys only. A standard default error response is compliant even though other lintdiff rules report unrelated fixture hygiene issues.

**Disposition:** No rule change beyond preserving this compliant behavior.

### Gap example: grouped status-code range

- **Classification:** TypeSpec miss fixed by production rule change
- **Status:** fixed
- **Project/API version:** focused fixture `NoErrorCodeResponses/status-code-range` / `2024-01-01`
- **Source:** `packages/typespec-lintdiff/test/fixtures/NoErrorCodeResponses/status-code-range/main.tsp`

**TypeSpec source**

```typespec
model RedirectRangeResponse {
  @minValue(300)
  @maxValue(399)
  @statusCode
  _: int32;

  @header("Location") location: string;
}
```

**Emitted OpenAPI or validator behavior**

```json
{
  "responses": {
    "200": {},
    "3XX": {}
  }
}
```

| Engine            | Observed result                                          |
| ----------------- | -------------------------------------------------------- |
| Swagger validator | `NoErrorCodeResponses` because `3XX` is not allowed.     |
| TypeSpec lint     | `no-error-code-responses` reports status code `300-399`. |

**Explanation:** The Swagger validator rejects every response key that is not
exactly `200`, `201`, `202`, `204`, or `default`. A TypeSpec numeric status-code
range emits a grouped OpenAPI key, so it must be treated as outside the allowed
exact-code set even when the range is below 400.

**Disposition:** Rule fixed and covered by fixture validation.

### Gap example: source/template expansion count-only delta

- **Classification:** count-only
- **Status:** intentional aggregation difference
- **Project/API version:** `specification/resources/resource-manager/Microsoft.Resources/deploymentStacks` / selected `2025-07-01`
- **Source:** `routes.tsp`, operation template `validateStack`

**TypeSpec source**

```typespec
interface DeploymentStackCommonOps<Scope extends Azure.ResourceManager.Foundations.SimpleResource> {
  #suppress "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes" "Back compat. There's a 400 response for validation failures."
  @action("validate")
  validateStack is Extension.ActionAsync<
    Scope,
    DeploymentStack,
    DeploymentStack,
    DeploymentStackValidateResult,
    Error = ErrorResponse | ValidationBadRequestResponse<DeploymentStackValidateResult>
  >;
}
```

**Emitted OpenAPI or validator behavior**

```json
{
  "responses": {
    "200": {},
    "202": {},
    "400": {},
    "default": {}
  }
}
```

| Engine            | Observed result                                                                         |
| ----------------- | --------------------------------------------------------------------------------------- |
| Swagger validator | 3 selected `responses/400` diagnostics for the emitted deployment stack validate paths. |
| TypeSpec lint     | 4 diagnostics at the shared `routes.tsp` `validateStack` source location.               |

**Explanation:** The TypeSpec rule sees semantic template instantiations before they are collapsed to the selected emitted Swagger path set. This changes diagnostic cardinality, not project coverage or checked behavior.

**Disposition:** No production-rule change; documented raw-count inequality.

### Gap example: source-only route plus resource operations count-only delta

- **Classification:** count-only
- **Status:** intentional aggregation difference
- **Project/API version:** `specification/solutions/Solutions.Management` / selected `2023-12-01-preview`
- **Source:** `Application.tsp`, `ApplicationDefinition.tsp`, `JitRequestDefinition.tsp`, and `routes.tsp`

**TypeSpec source**

```typespec
@route("/{+applicationId}")
@get
getById(...): ArmResponse<Application> | NotFoundResponse;

get is ArmResourceRead<Application, Response = ArmResponse<Application> | NotFoundResponse>;
```

**Emitted OpenAPI or validator behavior**

```json
{
  "paths": {
    "/{applicationId}": { "get": { "responses": { "200": {}, "404": {}, "default": {} } } }
  }
}
```

| Engine            | Observed result                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------- |
| Swagger validator | 4 selected `responses/404` diagnostics in `managedapplications.json`.                        |
| TypeSpec lint     | 5 source diagnostics, including `routes.tsp` `getById` plus resource operation declarations. |

**Explanation:** The TypeSpec corpus includes one additional semantic operation declaration that shares the same explicit `404` error response contract. The selected Swagger comparison collapses to four emitted response-key occurrences. The same project is covered, so this is a source-to-emission cardinality difference.

**Disposition:** No production-rule change; documented raw-count inequality.

## Focused fixture evidence

`pnpm --dir packages/typespec-lintdiff validate --rule NoErrorCodeResponses` passed after snapshot refresh:

| Fixture                     | Validator                       | TypeSpec mapped result                                                 | Purpose                                                                                       |
| --------------------------- | ------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `explicit-error-codes`      | 1 diagnostic at `responses/404` | local `no-error-code-responses` plus ARM POST response-code diagnostic | Existing explicit error status violation.                                                     |
| `nested-provider-namespace` | 1 diagnostic at `responses/302` | local `no-error-code-responses` plus ARM POST response-code diagnostic | Regression for ancestor-aware provider detection and non-allowed status keys outside 4xx/5xx. |
| `status-code-range`         | 1 diagnostic at `responses/3XX` | local `no-error-code-responses` plus ARM POST response-code diagnostic | Regression for grouped response-code ranges outside the validator allowed set.                |
| `default-error-response`    | no diagnostic                   | no mapped diagnostic; reviewed ambient diagnostics only                | Compliant default error response control.                                                     |

## Required TypeSpec changes

Completed:

1. Change `packages/typespec-lintdiff/src/rules/no-error-code-responses.ts` from descendant-oriented `resolveProviderNamespace` to ancestor-aware `getArmProviderNamespace`.
2. Treat TypeSpec status-code ranges as disallowed unless they collapse to a single allowed status code.
3. Add `nested-provider-namespace`, `status-code-range`, and `default-error-response` fixtures and snapshots.
4. Update `rule.md` to describe the validator's actual allowed response-code set and why the local rule remains necessary.

No dependency repair was required. No generated corpus files should be committed.

## Final conclusion

The migrated TypeSpec rule is functionally equivalent to `NoErrorCodeResponses` for valid ARM TypeSpec inputs after the provider-namespace and status-code-range fixes. The latest full corpus has complete same-project overlap and no one-sided projects. The remaining +2 TypeSpec raw diagnostics are explained by semantic-source versus emitted-response aggregation differences and do not indicate a missed Swagger behavior or TypeSpec false positive. No material uncertainty remains.
