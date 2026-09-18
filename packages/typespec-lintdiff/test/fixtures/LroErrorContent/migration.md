# LroErrorContent migration evidence

## Result and gap summary

**Native-rule repair completed; partial coverage, not functional equivalence.**
The full production comparison compiled **462/468 ARM projects**: Swagger
reported **639** diagnostics and native TypeSpec **637**, both in the same
**54 projects**, with no one-sided projects. Native output includes five
older-version declarations; excluding those leaves **632** selected-version
source findings. Four Swagger findings are legacy-marked GETs outside the
native selector. Three additional Swagger occurrences come from multiple
error statuses and scope expansions of single authored operations.
Focused fixtures record **20/39** diagnostics because native checking also
rejects inline errors and does not honor emitter overrides or SDK scope.
The required repair removes TCGC, `@typespec/openapi`, and unsafe mutation
while enforcing the explicitly selected standard-payload contract.
Historical return types and emitter-only LROs remain outside its scope.
Six compile failures are excluded from both populations, not treated as clean.

## Decision and scope

This is an explicitly authorized follow-up to merged [PR #5425](https://github.com/Azure/typespec-azure/pull/5425),
based on `origin/feature/lintdiff-migration-new` at
`29c4a87b0`. The source implementation required repair because its intended ARM
destination must not depend on TCGC, OpenAPI helpers, or unsafe graph mutation.
The requested development-skill restrictions are isolated in
[PR #5438](https://github.com/Azure/typespec-azure/pull/5438).
No official-library promotion is included.

The native contract was deliberately selected rather than claiming that
removing three imports preserves behavior. It checks the unprojected authored
HTTP program, recognizes non-GET LROs through Azure Core metadata, and requires
every existing default/4xx/5xx payload to use native ARM v2-or-later
`ErrorResponse` metadata. It accepts native common types, model-is copies,
standard native legacy references, and nullable standard errors. It does not
require bodies, inspect success payloads, or lint synchronous operations.
All response variants are checked, with one diagnostic per authored operation
node across statuses, nested services, and shared template instantiations.

No TCGC, OpenAPI helper, emitter, private-state adapter, or unsafe mutation is
used to make rule decisions. ARM's native reference APIs remain permitted.
Native tests throw on TCGC/AutoRest imports and exercise the rule without their
TypeSpec libraries or OpenAPI decorators. The tester registers OpenAPI solely
to satisfy the existing ARM library's transitive import.

## Source of truth and prior coverage

See [rule.md](rule.md) for direct upstream code, documentation, and test links,
the complete emission matrix, applicability boundaries, and official-rule
coverage analysis. The upstream revision is
`a970d991d2785184d2786b85e0a345dc3f37bc25`.
Its non-resolving selector checks only existing top-level error `schema.$ref`
values for operations explicitly emitted as LROs. It ignores inline schemas
and absent bodies. Its reference pattern accepts common-types v2 and later;
the unanchored regex and unescaped dot are preserved for native reference
metadata.

Official coverage remains a gap: status-selection rules do not check payload
identity, and native ARM async templates accept custom `Error` arguments.
The unsuppressed native-template fixture demonstrates authorability.
The raw-extension `restart` fixture's two suppressions are retained only to
demonstrate an emitter-only discrepancy, not to prove an actionable native gap.
No unrelated compiler or lint diagnostic is counted as target coverage.

## Comparable populations and historical reports

Pinned specs checkout: `f6b53f105b95da05276530a0754a1c71b4f16397`.
The runner receives an isolated specs checkout through `--specs-repo`.
The corpus selects 468 ARM projects, production validator mode, and each
project's dataset-selected API version. The local `all` ruleset runs over
unprojected source, with this rule's ARM service isolation. Existing source
suppressions remain effective.

The retained Swagger rule shard was generated at
`2026-08-06T08:03:27.940Z`; its 3,906 occurrences span more projects than the
selected TypeSpec population. Comparisons first restrict both sides to selected,
successfully compiled projects. Failed projects are not treated as compliant.
The [external report](../../../docs/coverage_old.md) has only aggregates:
its extra affected project cannot be reconstructed from that snapshot.

| Historical evidence                           | Population                                                                               | Swagger projects | Native projects | Overlap             | Raw Swagger/native |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------- | --------------- | ------------------- | ------------------ |
| External coverage snapshot                    | 450 compiled projects; 210 rules; imported at `6a418911dbe5d35992fb5845cf4460d45643fec8` | 55               | 55              | Not reconstructable | Not available      |
| Checked-in observed report before this repair | Generated `2026-08-10T09:38:18.108Z`; 462/468 successful; 215 known rules                | 54               | 55              | 54                  | 639/644            |
| Prior implementation's migration evidence     | Generated `2026-09-09T06:42:49.568Z`; 462/468 successful                                 | 54               | 54              | 54                  | 639/641            |

These are different report revisions, not current repair results. The external
report credits migration disposition; the
[observed report](../../../specs/coverage-breakdown.md) counts same-project
diagnostics. Neither matching project sets nor raw totals proves equivalence.
The previous migration evidence is preserved in
[the pre-repair source](https://github.com/Azure/typespec-azure/blob/feature/lintdiff-lro-error-content/packages/typespec-lintdiff/test/fixtures/LroErrorContent/migration.md).

## Focused results

All six fixtures compile and their refreshed snapshots are stable. The harness
classifies four as partial shared coverage, one as a native violation without
a Swagger violation, and one as a clean control with reviewed ambient
diagnostics. Those classifications are not per-operation parity claims.

| Fixture                 | Swagger diagnostics | Native diagnostics | Explanation                                                                                                 |
| ----------------------- | ------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `non-standard-error`    | 2                   | 1                  | Both flag `restartNative`; only Swagger flags raw-extension `restart`.                                      |
| `reference-shapes`      | 12                  | 13                 | Both flag twelve custom payload endpoints; native also flags SDK-scoped `sdkOnly`.                          |
| `external-references`   | 4                   | 4                  | Three shared violations; `standard` and `overriddenStandard` diverge in opposite directions.                |
| `inline-and-standard`   | 0                   | 18                 | Native rejects inline/primitive/collection/binary payloads and the false-overridden native LRO.             |
| `template-and-versions` | 2                   | 3                  | Shared `createOrUpdate`; native adds `disabled` and removed `oldAction`; Swagger adds legacy-only `marked`. |
| `standard-error`        | 0                   | 0                  | Native ARM templates and an error model-is copy, with unrelated diagnostics reviewed explicitly.            |

The 27 native tests cover type families, standard references including v1/wrong
definition/v10 cases, multiple error statuses, success/no-body/sync exclusions,
binary/multipart payloads, GET exclusion, unrelated services, unused templates,
nested services, shared operation instantiations, and the authored/historical
return-type boundary. The independent reviewer found duplicate diagnostics
through nested services; the repair restores authored-node deduplication and
adds both nested-service and template-instantiation regression tests.

## Code-backed gap examples

### Inline errors: deliberately stronger native payload policy

- **Classification:** TypeSpec-only.
- **Status:** intentional, explicitly selected native behavior.
- **Source:** `inline-and-standard/main.tsp`, `anonymous`.

```typespec
@route("/anonymous/{name}")
op anonymous is Lro<{
  anonymousCode: string;
}>;
```

The fixture's `Lro` template has native polling-operation metadata. Its emitted
500 schema is an inline object with `anonymousCode`, not a `$ref`.
Swagger therefore produces no diagnostic; the native lint reports the custom
payload. This difference extends to the primitive/collection/file/multipart
fallthroughs recorded in the emission matrix. Inlining is not reproduced or
guessed by production rule code.

### LRO selection and overrides

- **Classification:** both one-sided directions.
- **Status:** intentional native boundary.
- **Source:** `template-and-versions/main.tsp`, `disabled` and `marked`.

```typespec
@TypeSpec.OpenAPI.extension("x-ms-long-running-operation", false)
disabled is ArmResourceActionAsync<Widget, void, void, Error = CustomError>;

@route("/marked") @post
@Azure.ClientGenerator.Core.Legacy.markAsLro
op marked(): AcceptedResponse | CustomError;
```

| Target     | Swagger result                                                | Native result                                         |
| ---------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| `disabled` | Clean: emitted LRO flag is false.                             | Violation: ARM template supplies native LRO metadata. |
| `marked`   | Violation: legacy marker emits true with custom error `$ref`. | Clean: no native LRO metadata.                        |

The raw-extension-only `non-standard-error/restart` similarly remains
Swagger-only; its new unsuppressed `restartNative` is independently detected.
These differences cannot be repaired by importing TCGC or inspecting OpenAPI
state without violating the requested production boundary.

### SDK scope is not an ARM lint applicability filter

- **Classification:** TypeSpec-only.
- **Status:** intentional.
- **Source:** `reference-shapes/main.tsp`, `sdkOnly`.

```typespec
@Azure.ClientGenerator.Core.scope("csharp")
@route("/sdk-only/{name}")
op sdkOnly is Lro<ErrorBody>;
```

The native HTTP endpoint has polling metadata and a custom error body, so it
violates the rule. AutoRest omits the operation from Swagger; there is no
emitted node to compare. SDK-scoping decisions are no longer rule inputs.

### Emitter reference overrides do not change the native payload

- **Classification:** both one-sided directions.
- **Status:** intentional partial coverage.
- **Source:** `external-references/main.tsp`.

```typespec
@Autorest.useRef("../../../../../common-types/resource-management/v5/types.json#/definitions/ErrorResponse")
model StandardReference {
  code?: string;
}

@Autorest.useRef("#/definitions/LocalError")
model OverriddenStandard is CommonTypes.ErrorResponse;
```

| Target               | Emitted 400 reference  | Swagger / native                                |
| -------------------- | ---------------------- | ----------------------------------------------- |
| `standard`           | ARM v5 `ErrorResponse` | Clean / violation of the native custom payload. |
| `overriddenStandard` | Local `LocalError`     | Violation / native standard error is clean.     |

The equal fixture totals conceal these different targets. No emitter adapter
is used to force them to match.

### Authored program versus historical versions

- **Classification:** version/population difference and explicit coverage limit.
- **Status:** intentional boundary, not all-version equivalence.
- **Source:** `template-and-versions/oldAction` and the native historical-return test.

```typespec
@removed(Versions.current)
oldAction is ArmResourceActionAsync<Widget, void, void, Error = CustomError>;
```

The authored operation is still visible to native HTTP traversal and is
diagnosed; latest Swagger contains no `oldAction`. Conversely, the native test
uses `@returnTypeChangedFrom` to record a historical custom response on an
operation whose authored response is standard. It remains native-clean:
the rule no longer reconstructs that historical response. Removed declarations
being checked does not imply that all historical shapes are checked.

## Corpus execution

### Final full-run results

The replacement run completed with exit code zero at
`2026-09-09T18:09:23.3464107+08:00`. The result index records
`generatedAt: 2026-09-09T10:06:21.607Z`, `durationMs: 2199107`, and
`partial: false`. It selected all 468 projects and compiled 462 successfully.
The runner and library baseline is `29c4a87b0`, with this repair's rule changes;
specs and validator revisions are pinned above.

| Measure                                 |        Swagger | Native TypeSpec |
| --------------------------------------- | -------------: | --------------: |
| Affected successfully compiled projects |             54 |              54 |
| Raw diagnostics                         |            639 |             637 |
| Project + Swagger file + JSON path      |            639 |  Not applicable |
| Project + JSON path                     |            639 |  Not applicable |
| Project + source file + line + column   | Not applicable |             637 |
| Selected-version source attribution     |            639 |             632 |

The complete validator-only and TypeSpec-only project lists are both **empty**;
all 54 affected projects overlap. Among those projects, 47 have equal raw
counts, three have higher native counts, and four have higher Swagger counts.
The positive native-minus-Swagger contributions total **+5**, and negative
contributions total **-7**, producing the net **-2**. These conservative
identities remove no occurrences and do not assert a cross-engine bijection.
The counts were independently grouped from the two rule shards and matched
against the comparison report.

| Project (suffix of `specification/`)                                               | Selected API version | Swagger | Native raw | Native selected-version |
| ---------------------------------------------------------------------------------- | -------------------- | ------: | ---------: | ----------------------: |
| `batch/resource-manager/Microsoft.Batch/Batch`                                     | `2025-06-01`         |       5 |          6 |                       5 |
| `containerinstance/resource-manager/Microsoft.ContainerInstance/ContainerInstance` | `2026-08-01-preview` |       8 |         11 |                       8 |
| `cost-management/resource-manager/Microsoft.CostManagement/CostManagement`         | `2025-03-01`         |       8 |          6 |                       6 |
| `dataprotection/resource-manager/Microsoft.DataProtection/DataProtection`          | `2026-04-01-preview` |      17 |         18 |                      17 |
| `iothub/resource-manager/Microsoft.Devices/IoTHub`                                 | `2026-05-01-preview` |       6 |          5 |                       5 |
| `resources/resource-manager/Microsoft.Resources/deploymentStacks`                  | `2025-07-01`         |       3 |          1 |                       1 |
| `web/resource-manager/Microsoft.Web/AppService`                                    | `2026-07-15`         |      68 |         66 |                      66 |

Selected-version attribution removes exactly the five source targets proved
below; it is not a new projection run or a claim that historical return types
were reconstructed. Raw output remains 637. The prior implementation's 641
raw findings included the four legacy GETs now excluded; its 639/641 result is
superseded, not silently reused.

### Compile failures

These six projects failed HTTP compilation and were excluded from both sides.
Their diagnostic codes are compiler errors, not this lint's warnings.

| Project (suffix of `specification/`)                                                       | Error                              |
| ------------------------------------------------------------------------------------------ | ---------------------------------- |
| `deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices` | `@typespec/http/duplicate-body`    |
| `monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`                  | `@typespec/http/missing-uri-param` |
| `network/resource-manager/Microsoft.Network/Network/Network`                               | `@typespec/http/missing-uri-param` |
| `quota/resource-manager/Microsoft.Quota/Quota`                                             | `@typespec/http/missing-uri-param` |
| `resources/resource-manager/Microsoft.Resources/deployments`                               | `@typespec/http/duplicate-body`    |
| `servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`                     | `@typespec/http/duplicate-body`    |

For example, DeviceProvisioningServices reports `duplicate-body` at
`client.tsp:469:57`; Network reports `missing-uri-param` for
`applicationGatewayAvailableSslOption`. The full failure records and raw
stdout/stderr are retained with the session's machine-readable evidence.
The successful runner exit indicates completion of its analysis, not that
these six services compiled.

### Pinned real-service selector differences

CostManagement (`2025-03-01`) has eight retained Swagger findings, including two
GET operations marked only through legacy SDK/emitter authoring:
`GenerateCostDetailsReport_GetOperationResults` at `routes.tsp:1167-1191` and
`GenerateDetailedCostReportOperationResults_Get` at
`GenerateDetailedCostReportOperationResult.tsp:31-40`.
The former returns
`ArmResponse<CostDetailsOperationResults> | ArmAcceptedResponse | ErrorResponse`
under `@Azure.ClientGenerator.Core.Legacy.markAsLro`.
Its selected Swagger path ends in
`costDetailsOperationResults/{operationId}.get.responses.default.schema.$ref`.
The latter is the same selector difference at
`operationResults/{operationId}.get.responses.default.schema.$ref`.
Both emitted operations have `x-ms-long-running-operation: true`.

The relevant authored return at `routes.tsp:1188-1191` is:

```typespec
    | ArmResponse<CostDetailsOperationResults>
    | ArmAcceptedResponse
    | ErrorResponse;
```

The selected emitted GET has these fields:

```json
{
  "x-ms-long-running-operation": true,
  "responses": {
    "default": { "schema": { "$ref": "#/definitions/ErrorResponse" } }
  }
}
```

Swagger reports the local error reference; native checking excludes the GET.
This is an intentional selector difference, not emitted duplication.

AppService (`2026-07-15`) has 68 retained Swagger findings, including
`WebApps_GetProductionSiteDeploymentStatus` (`CsmDeploymentStatus.tsp:65-79`)
and `WebApps_GetSlotSiteDeploymentStatusSlot` (`CsmDeploymentStatus.tsp:128-142`).
Both are legacy-marked GETs with `DefaultErrorResponse`. The selected paths end
in `sites/{name}/deploymentStatus/{deploymentStatusId}` and
`sites/{name}/slots/{slot}/deploymentStatus/{deploymentStatusId}`, respectively;
both diagnostics target `get.responses.default.schema.$ref`.

These four occurrences remain Swagger violations but are outside the repaired
non-GET native selector. This is an explicit partial-coverage boundary, not a
validator false positive. AppService's unmarked
`StaticSitesAsyncOperations.getOperationResult` also stays native-excluded; it
has no emitted LRO flag and no retained target Swagger diagnostic.

### Older-version declarations in the authored program

The five older-version findings match these exact current diagnostic targets:

| Project           | Source target (line:column)                | Exclusion evidence                                                |
| ----------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| Batch             | `Certificate.tsp:130:3`                    | `delete` removed in selected `2025-06-01`                         |
| ContainerInstance | `SandboxGroup.tsp:175:3`, `187:3`, `197:3` | `SandboxGroups` removed in selected `2026-08-01-preview`          |
| DataProtection    | `BackupInstanceResource.tsp:192:3`         | `resumeProtectionLegacy` removed in selected `2026-04-01-preview` |

For example, ContainerInstance declares:

```typespec
@armResourceOperations
@added(Versions.v2026_06_01_preview)
@removed(Versions.v2026_08_01_preview)
interface SandboxGroups {}
```

Its create/update/delete operations use `Error = CloudError`. The same file's
new `AiAgentsGroups` interface is added in `2026-08-01-preview`; its diagnostics
at lines 375, 387, and 397 remain in the selected-version population. This is
declaration-level version evidence, not a filename-based filter. Similarly,
DataProtection's replacement `resumeProtection` at line 206 remains included.
The removed targets have no selected-version Swagger operation to compare.
Their five native findings are a population mismatch, not false positives or
a reason to mutate the compiler program.

### Multiple error statuses on one authored operation

- **Classification:** count-only, Swagger higher by one.
- **Status:** explained source-to-emission multiplicity; no rule update required.
- **Project/API version:** IoTHub / `2026-05-01-preview`.
- **Source:** `IotHubDescription.tsp:115-125`, `IotHubResource_Delete`.

The delete operation's `Response` includes this branch in addition to its
default `Error = ErrorDetails`:

```typespec
      | (NotFoundResponse & Body<ErrorDetails>),
    Error = ErrorDetails
```

The emitted LRO contains:

```json
{
  "404": { "schema": { "$ref": "#/definitions/ErrorDetails" } },
  "default": { "schema": { "$ref": "#/definitions/ErrorDetails" } }
}
```

Swagger diagnoses both `delete.responses.404.schema.$ref` and
`delete.responses.default.schema.$ref`. Native diagnoses the authored delete
once at `IotHubDescription.tsp:115:3`. The other four operation findings
correspond to create/update, manual failover, and private-endpoint
update/delete. This accounts for all six Swagger versus five native findings,
without discarding either error status from validation.

### Scoped template expansion from one authored operation

- **Classification:** count-only, Swagger higher by two.
- **Status:** explained source-to-emission multiplicity; no rule update required.
- **Project/API version:** deploymentStacks / `2025-07-01`.
- **Source:** `routes.tsp:41-50`, `DeploymentStackCommonOps.validateStack`.

```typespec
  validateStack is Extension.ActionAsync<
    Scope,
    DeploymentStack,
    DeploymentStack,
    DeploymentStackValidateResult,
    OverrideResourceName = ResourceName,
    Error =
      | ErrorResponse
      | ValidationBadRequestResponse<DeploymentStackValidateResult>
  >;
```

The template is instantiated for resource group, subscription, and management
group scopes at lines 84-96. Each emitted LRO has:

```json
{
  "400": {
    "schema": { "$ref": "#/definitions/DeploymentStackValidateResult" }
  }
}
```

Swagger flags `DeploymentStacks_ValidateStackAtResourceGroup`,
`DeploymentStacks_ValidateStackAtSubscription`, and
`DeploymentStacks_ValidateStackAtManagementGroup` at their
`post.responses.400.schema.$ref` paths. Native examines every instance but
reports the shared authored operation once at `routes.tsp:41:3`.
Project/path deduplication correctly retains the three distinct Swagger paths;
it cannot turn them into a single source identity.

### Conclusion and remaining limits

All seven unequal-project totals are explained: five native older-version
targets, four Swagger legacy GETs, and three additional Swagger occurrences
from status/scope expansion. No unexplained residual remains in these count
outliers, and no additional production rule update is required for them.
This does not establish per-target parity in every equal-count project.
The focused counterexamples prove that the repaired native rule is **not
functionally equal** to Swagger: it intentionally checks inline payloads and
does not read emitter-only state or reconstruct historical return types.
Six failed projects remain unassessed. The requested native repair is complete;
official ARM promotion is separate work.

### Run history

The representative BotService run completed successfully at
`2026-09-09T17:19:15.0734624+08:00` on the pinned checkout.
The first full attempt was intentionally interrupted after 30/468 completions
to preserve authored-node deduplication across template instances. Its output
is not final evidence. Its 24 newly generated graph files and four runner-owned
temporary configs were identified and removed; tracked generated corpus paths
were restored before restarting.

The replacement full run used the existing `specs:typespec` runner with
concurrency six:

```powershell
mise exec -- pnpm --dir packages\typespec-lintdiff specs:typespec `
  --specs-repo "<isolated-specs-checkout>" `
  --concurrency 6
```

Replace `<isolated-specs-checkout>` with the local isolated checkout path.

The final index, comparison report, both raw rule shards, selected outlier
Swagger files, six failure logs, deterministic aggregation output, and run log
are retained in this session's `files/lro-final-evidence` and adjacent artifacts.
Generated corpus files are validation-only and are not included in the repair
PR. Re-running the command at the pinned revisions regenerates the evidence;
the checked-in corpus report remains the historical snapshot described above.
