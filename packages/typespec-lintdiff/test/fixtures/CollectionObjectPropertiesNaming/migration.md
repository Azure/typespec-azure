# CollectionObjectPropertiesNaming migration

## Result and gap summary

In the full 468-project run at specs commit
`f6b53f105b95da05276530a0754a1c71b4f16397`, six projects failed to
compile and 462 were compared. Swagger reports three diagnostics in two
projects; the updated TypeSpec lint reports five in three projects, covering
both Swagger projects. The prior TypeSpec lint reported none: it required
explicit OpenAPI decorators and ARM resource-list metadata, missing paginated
POST actions. The two additional TypeSpec findings in AzureArcData belong to
the selected latest API version, but the validator ignores their `*_get...`
operation IDs despite emitted pageable POST responses. This is intentional
native semantic coverage, not a missing Swagger check or an older-version
population mismatch. The rule update is required and complete; the two
engines agree on all three Swagger findings at project level but are not
identical on valid authored operations. The old 140-project report is from a
different population and is not directly comparable.

## Native rule contract and coverage gate

- **Guideline:** In an ARM provider, a paginated `@list` operation's 200
  response body must declare a `value` property of array type, even when the
  annotated page items have another name.
- **Semantic API:** `isList` and `getPagingOperation` in
  `@typespec/compiler`, `getHttpOperation` in `@typespec/http`, and
  `getArmProviderNamespace` for lintdiff's mixed ARM/data-plane runner.
  The rule checks `paging.output.nextLink` rather than predicting an
  OpenAPI operation ID or reading an emitted extension. ARM's built-in
  `Azure.Core.Page<T>` supplies `@pageItems value: T[]`; list templates
  permit response overrides and custom paginated POST actions.
- **Diagnostic unit:** One per violating operation, targeting the response
  model when `value` is absent or the `value` property when it is not an
  array. Multiple uses of the same model may each be separately actionable.
- **Official coverage:** No official ARM/Core linter enforces this particular
  `value` response-property check. `no-openapi` rejects direct OpenAPI
  decorator overrides, but does not reject a custom `@pageItems items`
  response. The ARM response template parameter makes this an actionable
  gap rather than a template-enforced rule. The maintained RPC coverage
  document does not list an equivalent dedicated rule.

## Rule-local native and emission matrix

| Authored shape                                                                      | Supported?         | Native check / emitter result                                          | Swagger result                      | TypeSpec result / evidence                                  |
| ----------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| `@list` ARM GET with `@pageItems items: Widget[]` and `@nextLink nextLink?: string` | Yes                | Missing `value`; AutoRest emits `x-ms-pageable` with `itemName: items` | Error on 200 schema                 | Warning on response model; `missing-value-property`         |
| `@list` ARM POST action with the same response                                      | Yes                | Same semantic check; POST emits pageable operation                     | Error                               | Warning; `post-action-missing-value`                        |
| `@list` ARM GET with scalar `value` and array page items named `items`              | Yes                | `value` not an array; emitted schema has scalar `value`                | Error                               | Warning on `value`; `value-not-array`                       |
| `@list` GET with `@pageItems value: Widget[]` and a next link                       | Yes                | Array `value`; pageable extension                                      | No error                            | No warning; `value-array-nextlink`                          |
| `@list` GET with `@pageItems value` and custom `@nextLink nextPage`                 | Yes                | Array `value`; `nextLinkName: nextPage`                                | No error                            | No warning; `value-array-custom-nextlink`                   |
| `@list` GET with `@pageItems value` but no `@nextLink`                              | Yes                | No pageable extension                                                  | No error                            | No warning; `value-array-null-nextlink`                     |
| ARM resource list without `@list`                                                   | Yes                | No compiler paging marker                                              | No error                            | No warning; `non-pageable-non-list`                         |
| `@list` with no `@pageItems`, or scalar `@pageItems`                                | No                 | Compiler reports `missing-paging-items` or `decorator-wrong-target`    | Not a supported parity target       | No additional lint required; compiler paging implementation |
| Explicit `@extension("x-ms-pageable", ...)` or `@operationId(...)`                  | Azure lint-invalid | Official `no-openapi` rule rejects the decorators                      | Validator may still report an error | Intentional exclusion from native fixtures                  |

AutoRest's `resolveXmsPageable` and
`getXmsPageableForPagingOperation` emit the extension only for an `@list`
operation with `paging.output.nextLink`; a non-default page-items property
becomes `itemName`. This is research evidence, not a production dependency.
`getPagingOperation` itself supplies no paging result without page items.
The implementation follows this authorable semantic layer; it does not
simulate emitter schema formatting.

## Report reconciliation

| Source                                                                     | Population / mode                                                           | Swagger project count | TypeSpec project count |      Overlap | Raw diagnostics        |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------: | ---------------------: | -----------: | ---------------------- |
| [`coverage_old.md`](../../../docs/coverage_old.md), external gist snapshot | 450 compiled, aggregated coverage definitions                               |                   140 |                0 local | Not provided | Not provided           |
| [`coverage-breakdown.md`](../../../specs/coverage-breakdown.md), baseline  | 462 of 468, production, selected latest API version in Swagger              |                     2 |                      0 |            0 | 3 Swagger / 0 TypeSpec |
| Same report, regenerated after the source fix                              | 462 of 468, production, full TypeSpec run, selected latest Swagger versions |                     2 |                      3 |            2 | 3 Swagger / 5 TypeSpec |

The external snapshot credits official or structural coverage and uses a
different population. It provides no per-project findings, so its 140 cannot
be subtracted from the local 2 to identify services or infer semantic misses.
The local source report observes diagnostics on the same compiled projects
only. Fixture proofs are not real-service coverage. The updated run completed
on 2026-09-29 at 04:56 UTC using the complete `tsp-lintdiff-local-linter/all`
ruleset. Swagger's retained results refer to each project's selected latest
API version. The two source-only AzureArcData warnings have matching emitted
operations in that same selected version, so no older-version warnings need
to be excluded for this rule. Both originally affected projects compiled;
none of the six failed projects contributed to its assessed diagnostic set.

### Comparable project sets and diagnostic identities

- **Both engines:** `specification/machinelearningservices/MachineLearningServices.Management`
  (1 Swagger / 1 TypeSpec diagnostic) and
  `specification/web/resource-manager/Microsoft.Web/AppService` (2 / 2).
- **Validator-only:** none.
- **TypeSpec-only:** `specification/azurearcdata/resource-manager/Microsoft.AzureArcData/AzureArcData`
  (0 / 2, selected API version `2026-03-01-preview`).
- **Raw:** 3 Swagger versus 5 TypeSpec, positive difference 2 and negative
  difference 0. Swagger project + file + JSON-path deduplication retains 3;
  project + JSON-path without file also retains 3. TypeSpec project + source
  file + line + column deduplication yields 4, because the two AppService
  list actions report at the shared `ExpressionTraces.value` property.
  These identities are not interchangeable. Two projects have equal raw
  counts; one has TypeSpec higher; none has Swagger higher.
- **Compile failures (6/468):**
  `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`,
  `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`,
  `specification/network/resource-manager/Microsoft.Network/Network/Network`,
  `specification/quota/resource-manager/Microsoft.Quota/Quota`,
  `specification/resources/resource-manager/Microsoft.Resources/deployments`,
  and `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`.
  These are excluded from both project-level behavioral counts, not silently
  treated as clean.

## Code-backed gap example: paginated POST action

- **Classification:** Validator-only in the baseline
- **Status:** Fixed by the native rule update; both baseline Swagger projects
  overlap in the full run
- **Project/API version:** `specification/machinelearningservices/MachineLearningServices.Management` /
  `2026-05-15-preview`
- **Source:** `ComputeResource.tsp`, `ComputeResources.listNodes`; `models.tsp`,
  `AmlComputeNodesInformation`

**TypeSpec source**

```typespec
@list
listNodes is ArmResourceActionSync<
  ComputeResource,
  void,
  ArmResponse<AmlComputeNodesInformation>
>;

model AmlComputeNodesInformation {
  @pageItems
  nodes?: AmlComputeNodeInformation[];
  @nextLink
  nextLink?: string;
}
```

**Emitted OpenAPI / validator behavior**

```json
{
  "operationId": "Compute_ListNodes",
  "x-ms-pageable": { "nextLinkName": "nextLink", "itemName": "nodes" },
  "responses": { "200": { "schema": { "$ref": "#/definitions/AmlComputeNodesInformation" } } }
}
```

| Engine                 | Result                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Swagger validator      | One 200-schema diagnostic for absent `value` on the paginated POST action.                                            |
| Baseline TypeSpec lint | No diagnostic: the source rule required ARM resource-operation kind `list` and explicit OpenAPI extension decorators. |
| Updated TypeSpec lint  | Checks ARM provider `@list` operations and native paging metadata; the POST action is now in scope.                   |

**Explanation:** The TypeSpec source is a resource action, not an ARM
resource-list operation, but `@list` and `@nextLink` make it pageable. Web
AppService has two more validator findings of the same kind: both
`listExpressionTraces` actions return `ExpressionTraces` with
`@pageItems inputs?: ExpressionRoot[]`, a non-array `value?: unknown`,
and `@nextLink nextLink?: string`. Those two findings share the missing
native-list detection but exercise the non-array `value` diagnostic target.

**Disposition:** Extend the lint to native `@list` POST actions; maintain
`post-action-missing-value` and `value-not-array` fixture regressions.

### Gap example: paginated POST actions whose operation IDs do not say List

- **Classification:** TypeSpec-only
- **Status:** Intentional broader native contract, not a version mismatch
- **Project/API version:** `specification/azurearcdata/resource-manager/Microsoft.AzureArcData/AzureArcData` /
  `2026-03-01-preview`
- **Source:** `SqlServerInstance.tsp`, `getTelemetry` and
  `getBestPracticesAssessment`; `models.tsp`,
  `SqlServerInstanceTelemetryResponse` and `SqlServerInstanceBpaResponse`

**TypeSpec source**

```typespec
@operationId("SqlServerInstances_getTelemetry")
@list
@Azure.Core.useFinalStateVia("azure-async-operation")
getTelemetry is ArmResourceActionAsync<
  SqlServerInstance,
  SqlServerInstanceTelemetryRequest,
  ArmResponse<SqlServerInstanceTelemetryResponse>,
  LroHeaders = ArmCombinedLroHeaders<FinalResult = SqlServerInstanceTelemetryResponse> &
    Azure.Core.Foundations.RetryAfterHeader
>;

model SqlServerInstanceTelemetryResponse {
  @identifiers(#["name"])
  columns: SqlServerInstanceTelemetryColumn[];
  @pageItems
  @identifiers(#[])
  rows: string[][];
  @visibility(Lifecycle.Read)
  @nextLink
  nextLink?: string;
}
```

The authored operation includes a specific suppression for the official
`no-openapi` warning on `@operationId`. The second operation similarly sets
`SqlServerInstances_getBestPracticesAssessment` and returns
`SqlServerInstanceBpaResponse` with `@pageItems rows: string[][]` and
`@nextLink nextLink?: string`.

**Emitted OpenAPI / validator behavior** (selected latest version)

```json
{
  "operationId": "SqlServerInstances_getTelemetry",
  "x-ms-pageable": { "nextLinkName": "nextLink", "itemName": "rows" },
  "responses": {
    "200": { "schema": { "$ref": "#/definitions/SqlServerInstanceTelemetryResponse" } }
  }
}
```

| Engine            | Observed result                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | No finding for either pageable 200 response: its `.+_List([^_]*)$` operation-ID regex excludes `*_getTelemetry` and `*_getBestPracticesAssessment`. |
| TypeSpec lint     | Two warnings on the two response models, since native `@list` and `@nextLink` specify pagination regardless of the emitted operation ID.            |

**Explanation:** These operations are present in the retained
`2026-03-01-preview` OpenAPI and have no `value` array. The extra warnings
enforce the native ARM paginated-response shape for authorable list actions;
the legacy operation-ID naming filter is not a TypeSpec authoring constraint.

**Disposition:** Keep the native warnings and document the intentional
Swagger-count difference; do not parse generated operation IDs.

## Validation and corpus outcome

The seven focused fixture cases pass strictly: three violations match the
Swagger validator and four compliance cases have no rule diagnostic. The
remaining ambient diagnostics in four compliance fixtures are explicitly
accounted for in their `expect.json` files. The representative
MachineLearningServices run compared one project with one diagnostic on
each side. The full `specs:typespec --concurrency 6` run processed 468
projects in 18.3 minutes, with six compile failures and 462 assessable
projects; it found all three retained validator findings. The two
TypeSpec-only AzureArcData operations above account for the entire raw-count
remainder.

## Functional equivalence

The updated rule covers all observed validator projects and all three
Swagger findings at their corresponding authored models or properties.
It is functionally equivalent for the observed comparable Swagger cases
but intentionally broader for paginated actions with non-`List` operation
IDs; universal exact Swagger equivalence is not claimed. The seven native
fixtures and the two one-sided-project examples establish the relevant
valid TypeSpec behavior without emitter dependencies in production.
