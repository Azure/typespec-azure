# LroErrorContent migration evidence

## Conclusion

**TypeSpec rule update required.** The previous implementation checked model
ancestry rather than the emitted top-level error reference. It missed named
scalar/enum/union references and nested namespaces, accepted locally defined
derived error schemas, reported inline models that Swagger never selects, and
treated GET polling metadata as an emitted LRO flag.

Official coverage is a **gap**, not template enforcement. The standard ARM
operation templates permit custom `Error` arguments; registered official rules
do not validate the error reference. See [rule.md](rule.md) for the code-backed
coverage check, full emission matrix, upstream links, and promotion boundary.

The repaired rule follows semantic HTTP endpoints and every version snapshot,
resolves reference decorators/common-type metadata, and applies the emitter's
reference-versus-inline decisions. It reports once per authored operation.
No emitter, validator, unrelated lint rule, or harness dependency was changed.

**Functionally equivalent within the documented successful-emission scope.**
The final full run identifies the same 54 affected projects on both sides, with
no validator-only or TypeSpec-only projects. Five older-version source findings
and three additional emitted occurrences explain the raw count difference.
This conclusion does not claim raw diagnostic equality or coverage of the six
compile-failed projects, arbitrary emitter directory overrides, or invalid
schemas that fail emission.

## Sources and comparable populations

| Evidence                                                         | Revision / population                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [External coverage snapshot](../../../docs/coverage_old.md)      | 450 compiled projects, 210 validator rules; imported by repository commit `6a418911dbe5d35992fb5845cf4460d45643fec8` on 2026-08-11. The snapshot does not identify its original specs commit, generation timestamp, generator commit, or per-project results. |
| [Retained observed report](../../../specs/coverage-breakdown.md) | Before this repair: generated 2026-08-10T09:38:18.108Z, 462 successful / 468 selected projects, 215 known validator rules.                                                                                                                                    |
| Specs checkout and corpus dataset                                | `f6b53f105b95da05276530a0754a1c71b4f16397`                                                                                                                                                                                                                    |
| Validator source inspection                                      | `Azure/azure-openapi-validator` commit `a970d991d2785184d2786b85e0a345dc3f37bc25`; installed fixture ruleset supplies the same selector and pattern.                                                                                                          |
| Retained Swagger rule shard                                      | Generated 2026-08-06T08:03:27.940Z; 3,906 occurrences before successful-project population filtering.                                                                                                                                                         |
| TypeSpec comparison                                              | Local `all` ruleset; ARM service isolation inside this rule; normal production validator mode, not staging.                                                                                                                                                   |

Swagger retains each project's dataset-selected API version. TypeSpec source
analysis examines all declared version snapshots, with operation-node
deduplication. Compiler/emitter errors and failed projects are not evidence of
compliance. Both sides of the behavioral comparison exclude TypeSpec failures.
Existing service suppressions remain in effect; fixture ambient warnings are
reviewed separately from the target diagnostic.

## Report reconciliation

| Report                                         | Validator projects | Local TypeSpec projects | Official credit    | Same-project overlap                   | Validator only | TypeSpec only | Raw Swagger / TypeSpec |
| ---------------------------------------------- | ------------------ | ----------------------- | ------------------ | -------------------------------------- | -------------- | ------------- | ---------------------- |
| External snapshot (`lint`, 100%)               | 55                 | 55                      | 0                  | Not reconstructable from aggregate row | Not available  | Not available | Not available          |
| Retained observed production row before repair | 54                 | 55                      | No coverage credit | 54                                     | 0              | 1             | 639 / 644              |
| Final full production run after repair         | 54                 | 54                      | No coverage credit | 54                                     | 0              | 0             | 639 / 641              |

The external report credits migration disposition; the observed report requires
same-project diagnostics. For this row both name the local lint, so the 55 vs 54
validator-project difference cannot be explained by official/template credit.
The report denominators and snapshot metadata differ. Without the external
report's individual projects/revisions, identifying its extra project would be
speculation. The observed report's one-sided project is independently
identifiable: `specification/botservice/resource-manager/Microsoft.BotService/BotService`.

## Focused behavior

Four violation fixtures and one compliance fixture compile and match the target
validator outcomes. The template/version fixture intentionally includes an
old-only operation: latest Swagger has two violations, while the all-version
native lint has three source diagnostics. The native tests additionally cover
data-plane isolation, unused templates, nested namespaces and multi-status /
multi-version deduplication. Five native tests pass. AutoRest scope exclusion is
covered by an additional SDK-only operation in `reference-shapes` and a native
negative test; it adds no target diagnostic.

The emission matrix is shape-specific, not just response-surface coverage.
Inline array, tuple, record, model, literal, intrinsic, file, multipart and binary
fallthroughs are represented alongside named model/scalar/enum/union references
and authorable external overrides. Nonserializable types and emitter-error
unions are not counted as successful Swagger emission.

## Code-backed gap examples

### GET polling metadata is not an emitted LRO

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** `specification/botservice/resource-manager/Microsoft.BotService/BotService` / `2023-09-15-preview`
- **Source:** `routes.tsp`, `OperationResultsOperationGroup.get`, original diagnostic at line 91.

**TypeSpec source**

```typespec
@get
get(
  ...ApiVersionParameter,
  ...SubscriptionIdParameter,
  @path operationResultId: string,
):
  | ArmResponse<OperationResultsDescription>
  | ArmAcceptedLroResponse<LroHeaders = ArmLroLocationHeader<FinalResult = OperationResultsDescription> &
      Azure.Core.Foundations.RetryAfterHeader>
  | Error;
```

**Emitted OpenAPI or validator behavior**

The retained `botservice.json` operation `OperationResults_Get` has no
`x-ms-long-running-operation` field, even though its error has a local reference:

```json
{
  "operationId": "OperationResults_Get",
  "responses": {
    "default": {
      "description": "An unexpected error response.",
      "schema": { "$ref": "#/definitions/Error" }
    }
  }
}
```

| Engine                 | Observed result                                   |
| ---------------------- | ------------------------------------------------- |
| Swagger validator      | No diagnostic: the operation is not selected.     |
| Previous TypeSpec lint | One diagnostic: `getLroMetadata` was sufficient.  |
| Repaired TypeSpec lint | GET metadata alone does not select the operation. |

**Explanation:** AutoRest deliberately omits its inferred LRO flag for GET
polling endpoints. This service declares only the selected API version, so this
is not an older-version population mismatch.

**Disposition:** Match emitter LRO selection, preserving explicit extension and
legacy LRO-marker behavior.

### Native templates permit a custom error reference

- **Classification:** count-only / semantic miss in derived-shape cases
- **Status:** fixed
- **Project/API version:** focused `template-and-versions` / `2025-01-01`
- **Source:** `Widgets.createOrUpdate`.

**TypeSpec source**

```typespec
@error
model CustomError {
  code: string;
}
createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget, Error = CustomError>;
```

**Emitted OpenAPI or validator behavior**

```json
{
  "schema": { "$ref": "#/definitions/CustomError" }
}
```

| Engine            | Observed result                              |
| ----------------- | -------------------------------------------- |
| Swagger validator | Violation on the default response reference. |
| TypeSpec lint     | Violation on the authored operation.         |

**Explanation:** The `Error` template parameter is unconstrained beyond an
object type. A native template is not proof of standard-reference enforcement.
The related `reference-shapes/derived` fixture uses a model extending the
standard error; its top-level reference is still local, despite the common-type
reference inside its definition's `allOf`.

**Disposition:** Replace ancestry/name heuristics with reference classification.

### Removed operation belongs only to the old version

- **Classification:** count-only
- **Status:** population mismatch
- **Project/API version:** focused `template-and-versions` / selected `2025-01-01`
- **Source:** `Widgets.oldAction`.

**TypeSpec source**

```typespec
@removed(Versions.current)
oldAction is ArmResourceActionAsync<Widget, void, void, Error = CustomError>;
```

The service version enum declares `old: "2024-01-01"` and
`current: "2025-01-01"`. The latest Swagger snapshot omits `oldAction`; therefore
there is no selected-version Swagger operation to compare.

| Engine            | Observed result                                                 |
| ----------------- | --------------------------------------------------------------- |
| Swagger validator | Two latest-version operation violations.                        |
| TypeSpec lint     | Three all-version operation diagnostics, including `oldAction`. |

**Explanation:** This is valid older-version coverage, not a false positive.

**Disposition:** Preserve the raw TypeSpec count and compare only diagnostics
attributable to the selected API version.

The same cause is observable in these pinned real-service declarations:

| Project suffix                                  | Selected API version | Old-only source targets                                              | Evidence                                                                                                                                    |
| ----------------------------------------------- | -------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Microsoft.Batch/Batch`                         | `2025-06-01`         | `Certificate.tsp:130`, certificate delete                            | `@removed(Versions.v2025_06_01)` on the operation at line 129                                                                               |
| `Microsoft.ContainerInstance/ContainerInstance` | `2026-08-01-preview` | `SandboxGroup.tsp:175`, `:187`, `:197`, sandbox create/update/delete | `SandboxGroups` interface has `@removed(Versions.v2026_08_01_preview)` at line 148; the latest endpoints instead belong to `AiAgentsGroups` |
| `Microsoft.DataProtection/DataProtection`       | `2026-04-01-preview` | `BackupInstanceResource.tsp:192`, `resumeProtectionLegacy`           | `@removed(Versions.v2026_04_01_preview)` at line 190; the replacement `resumeProtection` at line 206 is added in that version               |

For example, the actual Batch declaration is:

```typespec
@removed(Versions.v2025_06_01)
delete is ArmResourceDeleteWithoutOkAsync<
  Certificate,
  Response =
    | ArmDeletedResponse
    | ArmDeleteAcceptedLroResponse
    | ArmDeletedNoContentResponse,
  Error = CloudError
>;
```

The retained `2025-06-01` Swagger has no certificate-delete endpoint. Five raw
native source diagnostics across these three projects therefore belong only to
older versions and must be excluded from selected-version cardinality comparisons.
Their source-level version decorators establish the exclusion without guessing
from filenames or suppressing valid older-version diagnostics.

### Legacy LRO markers select GET operations explicitly

- **Classification:** count-only
- **Status:** fixed
- **Project/API version:** `specification/cost-management/resource-manager/Microsoft.CostManagement/CostManagement` / `2025-03-01`
- **Source:** `routes.tsp:1170`, `GenerateCostDetailsReport.getOperationResults`; the same cause applies to `GenerateDetailedCostReportOperationResult.tsp:33`.

**TypeSpec source**

```typespec
@Azure.ClientGenerator.Core.Legacy.markAsLro
getOperationResults(
  ...ApiVersionParameter,
  @path(#{ allowReserved: true }) scope: string,
  ...Azure.ResourceManager.Legacy.Provider,
  @path @segment("costDetailsOperationResults") operationId: string,
):
  | ArmResponse<CostDetailsOperationResults>
  | ArmAcceptedResponse
  | ErrorResponse;
```

**Emitted OpenAPI or validator behavior**

```json
{
  "operationId": "GenerateCostDetailsReport_GetOperationResults",
  "x-ms-long-running-operation": true,
  "responses": {
    "default": {
      "description": "An unexpected error response.",
      "schema": { "$ref": "#/definitions/ErrorResponse" }
    }
  }
}
```

| Engine                 | Observed result                                                        |
| ---------------------- | ---------------------------------------------------------------------- |
| Swagger validator      | Eight violations in the retained project, including both marked GETs.  |
| Previous TypeSpec lint | Six diagnostics; it did not inspect the legacy marker.                 |
| Repaired TypeSpec lint | Uses `getMarkAsLro` in AutoRest scope, including explicit GET markers. |

**Explanation:** Ignoring all GETs would fix BotService but incorrectly lose
explicitly marked operations. The emitter treats a legacy marker separately
from inferred LRO metadata.

**Disposition:** Preserve the marker and extension precedence rather than using
an unconditional verb exclusion.

### A shared template produces three scoped Swagger operations

- **Classification:** count-only
- **Status:** intentional
- **Project/API version:** `specification/resources/resource-manager/Microsoft.Resources/deploymentStacks` / `2025-07-01`
- **Source:** `routes.tsp:41`, `DeploymentStackCommonOps.validateStack`.

**TypeSpec source**

```typespec
@added(Versions.v2024_03_01)
@action("validate")
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

`DeploymentStacksAtResourceGroup`, `DeploymentStacksAtSubscription` and
`DeploymentStacksAtManagementGroup` inherit this operation from a shared
template. The retained Swagger contains a violating `responses.400.schema.$ref`
under each of those three scope routes.

| Engine                 | Observed result                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Swagger validator      | Three distinct JSON paths, one per scope.                                                                            |
| Previous TypeSpec lint | Four diagnostics at the identical `routes.tsp:41:3` source location, including a client customization instantiation. |
| Repaired TypeSpec lint | Deduplicates by the authored operation node.                                                                         |

**Explanation:** File-independent Swagger paths still differ by scope; source
identity is shared. Equal raw totals would be an inappropriate requirement.

**Disposition:** Keep source-level reporting and retain separate occurrence
counts. A single actionable source fix addresses the emitted scope variants.

## New corpus run

The first representative ContainerApps run completed at
2026-09-08T08:19:13Z: one successful project, ten Swagger and ten native target
diagnostics. The first full run was intentionally interrupted after 172/468
projects to adopt the independent review's AutoRest endpoint-scope fix. That
partial run is not final evidence. Known generated corpus files and four
runner-owned temporary specs configs were removed before retrying.

The post-review DataBoxEdge check completed at 2026-09-08T08:37:51Z: one
successful project, 33 Swagger and 33 native target diagnostics. The final full
run completed successfully at **2026-09-08T09:07:31Z**, with aggregate generation
timestamp `2026-09-08T09:04:42.926Z` and duration `1,754,113 ms` (about 29 minutes).
It used the existing `specs:typespec --concurrency 6` runner against the isolated
pinned specs checkout, not a new per-rule runner.

| Population / identity                                       | Result                         |
| ----------------------------------------------------------- | ------------------------------ |
| Selected projects                                           | 468                            |
| Successful / failed                                         | 462 / 6                        |
| Validator projects / native projects / overlap              | 54 / 54 / 54                   |
| Complete validator-only project list                        | `[]`                           |
| Complete TypeSpec-only project list                         | `[]`                           |
| Raw Swagger / native diagnostics on successful projects     | 639 / 641                      |
| Swagger unique `(project, file, JSON path)`                 | 639                            |
| Swagger unique `(project, JSON path)`                       | 639                            |
| Native unique `(project, source file, line, column)`        | 641                            |
| Native older-version-only exclusions                        | 5                              |
| Native selected-latest-version source population            | 636 diagnostics in 54 projects |
| Raw equal-count / native-higher / validator-higher projects | 49 / 3 / 2                     |
| Sum of native-higher / validator-higher raw differences     | 5 / 3                          |

The complete set of unequal-count projects is:

| Project                                                                                          | Selected API version | Swagger raw | Native raw | Native selected-version | Cause                                                    |
| ------------------------------------------------------------------------------------------------ | -------------------- | ----------- | ---------- | ----------------------- | -------------------------------------------------------- |
| `specification/batch/resource-manager/Microsoft.Batch/Batch`                                     | `2025-06-01`         | 5           | 6          | 5                       | Removed certificate delete                               |
| `specification/containerinstance/resource-manager/Microsoft.ContainerInstance/ContainerInstance` | `2026-08-01-preview` | 8           | 11         | 8                       | Removed SandboxGroups interface's three LROs             |
| `specification/dataprotection/resource-manager/Microsoft.DataProtection/DataProtection`          | `2026-04-01-preview` | 17          | 18         | 17                      | Removed `resumeProtectionLegacy`                         |
| `specification/iothub/resource-manager/Microsoft.Devices/IoTHub`                                 | `2026-05-01-preview` | 6           | 5          | 5                       | One delete emits both 404 and default error references   |
| `specification/resources/resource-manager/Microsoft.Resources/deploymentStacks`                  | `2025-07-01`         | 3           | 1          | 1                       | One authored template operation emits three scope routes |

All other 49 overlapping projects have equal raw counts. The largest equal-count
projects include Compute (86), AppService (68), and DocumentDB (56). CostManagement
now covers all eight emitted violations, including the two legacy-marked GETs.
BotService is clean on both sides. AppService's two legacy-marked
`CsmDeploymentStatus.tsp` operations are now included, while its unmarked
`StaticSitesAsyncOperations.getOperationResult` GET is excluded.

No latest-version diagnostic is discarded by a filename heuristic. The five
older-version exclusions are proven by the source decorators recorded above.
After this attribution, the remaining `639 - 636 = 3` difference is exactly the
two extra deploymentStacks scope occurrences plus IoTHub's second error status.
No stronger cross-domain canonical identity or count-equalizing rule change is
needed.

### Two error statuses share one authored operation

- **Classification:** count-only
- **Status:** intentional
- **Project/API version:** `specification/iothub/resource-manager/Microsoft.Devices/IoTHub` / `2026-05-01-preview`
- **Source:** `IotHubDescription.tsp:115`, `delete`.

**TypeSpec source**

```typespec
delete is ArmResourceDeleteWithoutOkAsync<
  IotHubDescription,
  Response =
    | ArmResponse<IotHubDescription>
    | (ArmAcceptedLroResponse<LroHeaders = ArmCombinedLroHeaders<FinalResult = IotHubDescription> &
        Azure.Core.Foundations.RetryAfterHeader> &
        Body<IotHubDescription>)
    | ArmDeletedNoContentResponse
    | (NotFoundResponse & Body<ErrorDetails>),
  Error = ErrorDetails
>;
```

**Emitted OpenAPI or validator behavior**

The retained delete response set contains:

```json
{
  "404": { "schema": { "$ref": "#/definitions/ErrorDetails" } },
  "default": { "schema": { "$ref": "#/definitions/ErrorDetails" } }
}
```

| Engine            | Observed result                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Swagger validator | Two findings for this delete: `responses.404.schema.$ref` and `responses.default.schema.$ref`. |
| TypeSpec lint     | One finding at `IotHubDescription.tsp:115:3`.                                                  |

**Explanation:** The author fixes one operation's response contract; separate
Swagger status paths are not separate authored operations.

**Disposition:** Keep once-per-operation reporting, covered by the multi-status
native regression test. Do not force equality by duplicating diagnostics.

### Compile failures and uncertainty

The full run has exactly the same six failed projects as the retained baseline:

| Excluded project                                                                                         | Compiler error                                                         |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices` | `@typespec/http/duplicate-body`, including `client.tsp:469` and `:534` |
| `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`                  | `@typespec/http/missing-uri-param`                                     |
| `specification/network/resource-manager/Microsoft.Network/Network/Network`                               | `@typespec/http/missing-uri-param`                                     |
| `specification/quota/resource-manager/Microsoft.Quota/Quota`                                             | `@typespec/http/missing-uri-param`                                     |
| `specification/resources/resource-manager/Microsoft.Resources/deployments`                               | `@typespec/http/duplicate-body`                                        |
| `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`                     | `@typespec/http/duplicate-body`                                        |

Their errors and source targets are retained in the runner's per-project
`raw/typespec.stdout.txt` / `raw/typespec.stderr.txt` artifacts during analysis.
They are excluded from both sides of the behavioral population; no equivalence
claim is made for them. The external coverage snapshot's unrecorded original
revision remains a report-provenance limit, not evidence of a new semantic gap.

Generated corpus and coverage data are validation artifacts and are not part of
this PR. Reproduce with the command above and the pinned specs commit; the
retained comparison declaration and code-backed excerpts here remain reviewable
after generated files are restored.

## Independent review

The reviewer identified one valid actionable finding: exclude operations outside
the AutoRest emitter's TCGC scope before checking LRO error references. Adopted
with `isInScope` and both native and emitted-fixture regression coverage.
No findings were rejected. The reviewer found no further implementation issues
on follow-up. The final complete-diff and migration-evidence review also reported
no significant issues before committing.
