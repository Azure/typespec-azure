# NoErrorCodeResponses migration

## Result and gap summary

The September 23 full production run compiled **462/468 projects** at specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`: **20/20 affected-project overlap**, no one-sided projects, and **144 validator versus 146 TypeSpec diagnostics**. The +2 comes from a C#-scoped concrete endpoint excluded by AutoRest in `deploymentStacks` (+1) and an `x-ms-paths` endpoint omitted by the validator's `paths`-only selector in `Solutions.Management` (+1). Neither is a non-endpoint template duplicate. The rule fixes ancestor-aware ARM detection, status ranges, and non-endpoint template warnings; 21 native tests and 17 focused/affected fixtures pass. No further production change is required for these explained count differences. The native allowed-status policy matches shared endpoints, but **exact Swagger parity is partial** because SDK scoping and `x-ms-paths` selection differ. Six compile-failed projects and unprojected historical-version shapes remain outside the equivalence conclusion.

## Coverage classification

- **Worker existing TypeSpec coverage classification:** `gap`.
- **Official evidence:** `@azure-tools/typespec-azure-core/no-error-status-codes` documents a LintDiff equivalent, and the ARM ruleset enables it, but its implementation returns early unless the operation namespace name starts with `Azure.` and checks only numeric 4xx/5xx codes. ARM services in the corpus use provider namespaces such as `Microsoft.*`, so this official rule does not enforce the validator behavior for ARM service operations. `@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes` catches some POST cases but does not enforce this allowed set across every HTTP method.
- **Implemented rule:** `tsp-lintdiff-local-linter/no-error-code-responses` checks HTTP operation responses in ARM provider namespaces and reports every response status outside `200`, `201`, `202`, `204`, and `default`, including grouped/ranged status codes such
  as `3XX`.

## Source-of-truth rule behavior

- Validator ruleset entry: `packages/rulesets/src/spectral/az-arm.ts` rule `NoErrorCodeResponses`, `given: ["$.paths.*.*.responses.*~"]`.
- Validator function: `packages/rulesets/src/spectral/functions/no-error-code-responses.ts`.
- Validator source link: [NoErrorCodeResponses](https://github.com/Azure/azure-openapi-validator/blob/main/packages/rulesets/src/spectral/functions/no-error-code-responses.ts).
- Validator doc link: [openapi-authoring-automated-guidelines.md](https://github.com/Azure/azure-rest-api-specs/blob/main/documentation/openapi-authoring-automated-guidelines.md).

The Swagger validator receives every response object key for every operation under **`paths` only**, not `x-ms-paths`. It returns no diagnostic when the key is exactly `200`, `201`, `202`, `204`, or `default`; every other nonempty string response key is reported at that key's path. Its defensive non-string/empty-input guard concerns invalid Swagger keys, not additional native authoring shapes. The native TypeSpec contract is an ARM HTTP endpoint response-status check, not an emitter simulation. The implementation uses `getAllHttpServices` and `getArmProviderNamespace`; it does not import emitters, `@typespec/openapi`, TCGC, or unsafe compiler mutation.

## Report reconciliation

| Report                        | Snapshot / scope                                          | Row    | Validator projects | Local TypeSpec projects |                     Official credited |        Overlap | One-sided projects                        | Raw diagnostics             |
| ----------------------------- | --------------------------------------------------------- | ------ | -----------------: | ----------------------: | ------------------------------------: | -------------: | ----------------------------------------- | --------------------------- |
| `docs/coverage_old.md`        | external gist, 450 compiled projects, 210 validator rules | `lint` |                 20 |                      20 |                                     0 | aggregate only | not reconstructable from aggregate report | not listed in row           |
| `specs/coverage-breakdown.md` | full local production run, 462/468 compiled projects      | `lint` |                 20 |                      20 | context only (`officialMapping: yes`) |             20 | 0 validator-only, 0 TypeSpec-only         | validator 144, TypeSpec 146 |

The reports use different snapshots and definitions. `coverage_old.md` asks whether each validator firing has some migration disposition and gives aggregate rows; `coverage-breakdown.md` credits only observed same-project TypeSpec diagnostics in successfully compiled projects.

## Full corpus evidence (September 23)

- Specs commit: `f6b53f105b95da05276530a0754a1c71b4f16397`.
- Run: full `specs:typespec --concurrency 6`, generated at `2026-09-23T08:16:33.333Z`; runner exited successfully after all 468 projects. A one-project `--filter deploymentStacks` run passed first.
- Integrated target: `de173bb8109f02bcfd355aff16572ae539cd800b`, preserving original source commit `e1ccfa817befb6f19c96d9a2962b64f2e7764d16` through a merge. Validation includes the uncommitted endpoint fix, not merely that historical commit.
- Native-source/config fingerprint recorded by the runner: `sha256:1473023b1e33089df32ef5ebdc4ed682e97eed3f9bc8ce47ed0359c53c593fd1`.
- Scope: 468 source projects; 462 compiled successfully; 6 compile failures are excluded from both sides of the behavioral comparison.
- Compile failures: `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`, `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`, `specification/network/resource-manager/Microsoft.Network/Network/Network`, `specification/quota/resource-manager/Microsoft.Quota/Quota`, `specification/resources/resource-manager/Microsoft.Resources/deployments`, `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`.
- Validator projects: `specification/advisor/resource-manager/Microsoft.Advisor/Advisor`, `specification/apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement`, `specification/app/resource-manager/Microsoft.App/ContainerApps`, `specification/automation/Automation.Management`, `specification/billingbenefits/resource-manager/Microsoft.BillingBenefits/BillingBenefits`, `specification/cosmos-db/resource-manager/Microsoft.DocumentDB/DocumentDB`, `specification/datafactory/resource-manager/Microsoft.DataFactory/DataFactory`, `specification/domainregistration/resource-manager/Microsoft.DomainRegistration/DomainRegistration`, `specification/hdinsight/resource-manager/Microsoft.HDInsight/HDInsight`, `specification/iothub/resource-manager/Microsoft.Devices/IoTHub`, `specification/monitor/resource-manager/Microsoft.Insights/Insights/ActionGroupsApi`, `specification/operationalinsights/resource-manager/Microsoft.OperationalInsights/OperationalInsights`, `specification/paloaltonetworks/resource-manager/PaloAltoNetworks.Cloudngfw/Cloudngfw`, `specification/resources/resource-manager/Microsoft.Resources/deploymentStacks`, `specification/resources/resource-manager/Microsoft.Resources/resources`, `specification/search/resource-manager/Microsoft.Search/Search`, `specification/serialconsole/resource-manager/Microsoft.SerialConsole/SerialConsole`, `specification/solutions/Solutions.Management`, `specification/storagecache/resource-manager/Microsoft.StorageCache/StorageCache`, `specification/web/resource-manager/Microsoft.Web/AppService`.
- TypeSpec projects: same 20 projects.
- Validator-only projects: none.
- TypeSpec-only projects: none.
- API-version policy: Swagger uses each dataset project's selected `apiVersion`; this rule has no `projectionScope: http-reachable`, so its TypeSpec diagnostics are **unprojected**. The harness excludes failed projects from both sides, but does not project this rule to the latest version. No TypeSpec-only project needs attribution. Both count outliers below are present in the selected versions, rather than older-version-only declarations. These observations do not establish exhaustive historical-version parity.

The six exclusions are the same projects recorded in the September 14 run.
Their current compiler diagnostics are HTTP `duplicate-body`
(DeviceProvisioningServices, deployments, ServiceLinker) or `missing-uri-param`
(TenantActionGroups, Network, Quota), not this warning rule. No behavioral
equivalence is claimed for excluded projects.

The September 14 run also recorded 462/468, 20/20, and 144/146. Matching totals
do not validate the old non-endpoint traversal or its old gap explanations.
The current endpoint regressions and the precise causes below supersede those
claims. The regenerated reports and diagnostic shards are validation artifacts,
not files to commit with the rule.

## Diagnostic cardinality

| Identity                              | Validator | TypeSpec | Notes                                                                |
| ------------------------------------- | --------: | -------: | -------------------------------------------------------------------- |
| Coverage-row selected diagnostics     |       144 |      146 | Latest full production comparison row.                               |
| Rule shard raw file diagnostics       |       155 |      157 | Raw by-rule files before coverage selection; same +2 delta.          |
| Project count                         |        20 |       20 | Exact same project set.                                              |
| Project + Swagger file + JSON path    |       144 |        — | No duplicate selected validator identities.                          |
| Project + JSON path                   |       144 |        — | Removing Swagger file identity does not merge any selected findings. |
| Project + source file + line + column |         — |      141 | Source-location identity loses distinct endpoint/status findings.    |

Eighteen overlap projects have equal raw counts, two are TypeSpec-higher, and none
are validator-higher: total positive difference +2, negative difference 0.
The only per-project differences are `deploymentStacks` (3 versus 4) and
`Solutions.Management` (4 versus 5). Deduplicating TypeSpec by source position is
not a valid diagnostic policy: four concrete `validateStack` endpoints share
`routes.tsp:41:3`, while two AppService operations (`VnetRoute.tsp:81:3` and
`:95:3`) each have independently disallowed 400 and 404 responses. These account
for all five collapsed source identities (146 to 141). No cross-engine fuzzy
matching or production deduplication is introduced.

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

### Gap example: C#-scoped concrete endpoint outside AutoRest scope

- **Classification:** count-only
- **Status:** intentional native-contract difference
- **Project/API version:** `specification/resources/resource-manager/Microsoft.Resources/deploymentStacks` / selected `2025-07-01`
- **Source:** `routes.tsp:41`, `client.tsp`, concrete interface `DeploymentStacksAtScope`

**TypeSpec source**

```typespec
@@armResourceOperations(DeploymentStacksAtScope);
interface DeploymentStacksAtScope
  extends DeploymentStackCommonOps<Extension.ScopeParameter, "DeploymentStack"> {}

@@scope(DeploymentStacksAtScope.validateStack, "csharp");
```

**Emitted OpenAPI or validator behavior**

The shared operation customization contains
`Error = ErrorResponse | ValidationBadRequestResponse<DeploymentStackValidateResult>`.
The three ordinary resource-group, subscription, and management-group endpoints
are retained in the selected Swagger, each with:

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

**Explanation:** All four are concrete HTTP endpoints; the fourth is not a
generic source-operation artifact. `client.tsp` adds the C#-only scoped interface,
while AutoRest's `openapi.ts` filters routes through `isInScope` before emission.
The native ARM rule intentionally does not load TCGC to simulate SDK/emitter
selection. All four inherited declarations target `routes.tsp:41:3`. The
`validateStack` operation was added at `2024-03-01`, so this is not an
older-version-only diagnostic relative to the selected `2025-07-01`.

**Disposition:** No production-rule change. Preserve the native endpoint check;
document the SDK-scoping parity limit rather than add a prohibited dependency.

### Gap example: validator excludes an emitted `x-ms-paths` endpoint

- **Classification:** count-only
- **Status:** intentional broader native endpoint coverage
- **Project/API version:** `specification/solutions/Solutions.Management` / selected `2023-12-01-preview`
- **Source:** `ApplicationDefinition.tsp:96`, `ApplicationDefinitionOpsById.getById`

**TypeSpec source**

```typespec
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Solutions/applicationDefinitions/{applicationDefinitionName}?disambiguation_dummy")
@armResourceOperations(#{ allowStaticRoutes: true, omitTags: true })
interface ApplicationDefinitionOpsById {
  @sharedRoute
  getById is ApplicationDefinitionOps.Read<
    ApplicationDefinition,
    Response = ArmResponse<ApplicationDefinition> | NotFoundResponse
  >;
}
```

**Emitted OpenAPI or validator behavior**

```json
{
  "x-ms-paths": {
    "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Solutions/applicationDefinitions/{applicationDefinitionName}?disambiguation_dummy": {
      "get": {
        "operationId": "ApplicationDefinitions_GetById",
        "responses": { "200": {}, "404": {}, "default": {} }
      }
    }
  }
}
```

| Engine            | Observed result                                                              |
| ----------------- | ---------------------------------------------------------------------------- |
| Swagger validator | 4 `paths` response-key diagnostics; none for the `x-ms-paths` 404.           |
| TypeSpec lint     | 5 concrete endpoint diagnostics, including `ApplicationDefinition.tsp:96:3`. |

**Explanation:** The retained Swagger really has five explicit 404 responses:
four under `paths`, one under `x-ms-paths`. The validator's
`given: ["$.paths.*.*.responses.*~"]` omits the latter. AutoRest's `initPathItem`
places the query-disambiguated shared route under `x-ms-paths`; no emitted
occurrence was collapsed. `routes.tsp`'s `ApplicationsOperationGroup.getById`
is already among the four matching `paths` findings and is not the extra
diagnostic. The native rule checks both endpoint forms without emitter logic.

**Disposition:** No production-rule change. Do not copy the Swagger selector's
omission into native validation.

### Gap example: non-endpoint template warning removed

- **Classification:** native false positive fixed independently of corpus counts
- **Status:** fixed
- **Source:** `test/rules/no-error-code-responses.test.ts`, nested template regression

```typespec
namespace Nested {
  @get op Template<T>(): {
    @statusCode status: 404;
    @body body: T;
  };
  @route("/one") op read is Template<string>;
  @route("/two") op readAgain is Template<string>;
}
```

There are two HTTP endpoints, hence two actionable response-status findings.
The old visitor also reported the instantiated `Template` declaration.
`getAllHttpServices` now selects only `read` and `readAgain`. Native tests assert
their exact targets and that suppressing both concrete endpoints leaves no
template warning. The LroErrorContent comparison snapshots also lose only
non-endpoint `Lro` warnings while retaining concrete endpoint diagnostics.
This correctness fix does not change the observed real-corpus counts above.

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
5. Enumerate HTTP endpoints rather than every visited operation, excluding non-endpoint template instances and preserving concrete endpoint suppression.
6. Add 21 emitter-free native regressions and refresh directly affected ambient snapshots/expectations in `LroErrorContent` and `MissingXmsErrorResponse`. Strict fixture validation passes all 17 cases across the three groups; this does not change the other rules' migration classifications.

No dependency repair was required. No generated corpus files should be committed.

## Final conclusion

The native allowed-response-status guideline is implemented for concrete ARM
HTTP endpoints, with supported-shape, target/count, and suppression evidence.
The fresh full corpus has complete observed project overlap and fully explained
count differences. No further TypeSpec production update is required for those
differences. Exact executable Swagger equivalence remains partial: the native
rule does not simulate SDK scope or reproduce the validator's `x-ms-paths`
omission. Unprojected historical-version behavior and the six compile-failed
projects are not established by this corpus. Equal project coverage is not a
claim of universal parity.
