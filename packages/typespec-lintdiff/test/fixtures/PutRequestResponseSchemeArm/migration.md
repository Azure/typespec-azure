# PutRequestResponseSchemeArm migration

## Result and gap summary

The completed full corpus reports **160/153 Swagger/TypeSpec diagnostics in 36/34 projects**, across 462 successfully compiled projects out of 468: 34 overlaps, two validator-only projects, and no TypeSpec-only projects. Eight Swagger-only missing-response-schema occurrences, minus one native Batch finding from an older API version, explain the seven-diagnostic gap. Native equality leaves missing schemas to response-body guidance; excluding the older finding yields 152 native diagnostics. The repairs cover absent requests, equivalent unions/enums, named properties alongside indexers, and scalar base chains. All 106 native tests pass, and both shared-rule consumers retain exactly their previous corpus diagnostic records. An initial corpus-output failure was retained and followed by successful authorized runs using an isolated copy of the same dataset. Coverage remains partial: SDK enum metadata is excluded, six known compile failures remain outside comparison, and corpus overlap does not prove universal Swagger equivalence.

## Conclusion

- **Coverage classification:** partial, with intentional native-contract boundaries for missing success response schemas and emitted SDK enum metadata.
- **TypeSpec rule update:** required and completed. `comparePutRequestAndResponse` skips `void` request bodies, and its shared union comparator matches unnamed variants structurally rather than by compiler-generated symbol identity. Direct enums and enum-member types share the same label and effective-value comparison; named-variant matching is unchanged. The latest changes prevent matching indexers from bypassing named properties and compare scalar names through the base chain.
- **Coverage limits:** the residual validator-only projects are explained by Swagger's empty-response-schema behavior on already-invalid/suppressed ARM operations. The six excluded compile failures and finite fixture matrix preclude a universal equivalence claim.

## Reports and source revisions

The latest full-corpus validation generated results at
`2026-09-16T09:46:34.170Z` and completed at
`2026-09-16T09:49:05.0026262Z` after 1,241,040 ms of analysis. It ran all
468 projects with concurrency 6 and no filter, using the existing runner's
`--output` option on an isolated copy of the pinned dataset. All 76,313 input
files were verified byte-identical before the recovery sample. The earlier
2026-09-15 result below is retained for comparison; both rule consumers'
diagnostic records and all project statuses match that completed run exactly.

| Source                       | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| External coverage snapshot   | `packages/typespec-lintdiff/docs/coverage_old.md`, gist `https://gist.github.com/catalinaperalta/b2e7d29a33b4b451bcfcc87e8314565a`, 450 compiled projects, 210 validator rules                                                                                                                                                                                                                                                                                        |
| Checked-in lintdiff baseline | [`packages/typespec-lintdiff/specs/coverage-breakdown.md`](../../../specs/coverage-breakdown.md), specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`, full scope 462/468 successful projects; this restored generated baseline records the before-fix row                                                                                                                                                                                                        |
| Post-fix validation run      | Full-corpus validation generated `2026-09-15T16:24:14.609Z` at the same specs commit and scope, after the void-body, unnamed-union, enum-member, and direct-enum repairs; completed successfully at `2026-09-15T16:26:35.3414340Z`. Its post-fix row is recorded below. Generated `packages/typespec-lintdiff/specs` outputs are validation evidence only and were restored before publication.                                                                       |
| Validator source             | Azure/azure-openapi-validator at `1198225afecbb818c3050d4d2a91da92e14e56ce`: [ARM rule registration](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/az-arm.ts) and [`putRequestResponseScheme` implementation](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/functions/put-request-response-scheme.ts) |
| Migrated rule                | `packages/typespec-lintdiff/src/rules/put-request-response-scheme-arm.ts` plus shared comparison helper `put-request-response-scheme-shared.ts`                                                                                                                                                                                                                                                                                                                       |

## Report reconciliation

| Report                                                             | Row/category                | Validator projects | Local TypeSpec projects |             Official credited |    Overlap | Validator-only | TypeSpec-only | Diagnostics                   |
| ------------------------------------------------------------------ | --------------------------- | -----------------: | ----------------------: | ----------------------------: | ---------: | -------------: | ------------: | ----------------------------- |
| `coverage_old.md`                                                  | `100% coverage`             |                 36 |                      34 |                             2 | not listed |     not listed |    not listed | aggregate project counts only |
| Checked-in `coverage-breakdown.md` baseline before this fix        | `Partial observed coverage` |                 36 |                      42 | mapping present, not credited |         34 |              2 |             8 | 160 validator / 184 TypeSpec  |
| Latest isolated full-corpus validation after indexer/scalar repair | `Partial observed coverage` |                 36 |                      34 | mapping present, not credited |         34 |              2 |             0 | 160 validator / 153 TypeSpec  |

The old report credited official or otherwise settled coverage, so it reported 100% even though only 34 direct local lint projects fired. The lintdiff report credits only same-project diagnostic overlap in successful TypeSpec projects, so the two response-body-only validator projects remain visible as gaps.

The checked-in [`coverage-breakdown.md`](../../../specs/coverage-breakdown.md) is
the restored generated baseline and therefore still contains the before-fix
42-project/184-diagnostic TypeSpec row. The 34-project/153-diagnostic after-fix
row comes from the isolated validation run recorded in this migration
evidence; the generated coverage files were intentionally not committed.

## Validator behavior

The Spectral ARM rule is registered on every PUT operation's `200` or `201` response ancestor:

```ts
given: ["$[paths,'x-ms-paths'].*[put][responses][?(@property === '200' || @property === '201')]^^"],
then: { function: putRequestResponseScheme }
```

The shared function finds the first body parameter schema, returns no diagnostic when there is no request-body schema, then compares that schema with `responses[200].schema` or falls back to `responses[201].schema`. If the response exists but has no schema, the validator compares the request schema with `{}` and reports a mismatch.

## Native TypeSpec behavior

The migrated rule visits ARM provider PUT operations, reads HTTP operation metadata, compares the request body type with the primary `200` response body type or fallback `201` response body type, and reports on the operation when both body schemas exist and differ. The helper compares TypeSpec semantic models, scalars, enums, tuples, unions, arrays, indexers, inherited properties, property optionality, and property types. It now treats `void` request bodies as absent schemas, matching the validator's no-request-schema exit and avoiding emitter-specific false positives without changing shared data-plane response handling. The shared-helper behavior is also covered by the data-plane `PutRequestResponseScheme/no-request-body` fixture.

## Native shape matrix

| Authored TypeSpec shape                                              | Valid/support status                                                                  | Selected OpenAPI field                                  | Swagger result | TypeSpec result                                               | Evidence                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| PUT request body and `200` response body use the same resource model | Supported ARM template path                                                           | body parameter schema and `responses[200].schema` match | No diagnostic  | No mapped diagnostic                                          | `compliant` fixture                                                      |
| PUT request body differs from `200` response body                    | Supported custom operation                                                            | both schemas present, `200` selected                    | Diagnostic     | `put-request-response-scheme-arm` diagnostic                  | `request-body-mismatch-response-match`, `arm-resource-mismatch` fixtures |
| PUT has no `200`; request body differs from `201` response body      | Supported custom operation                                                            | both schemas present, `201` fallback selected           | Diagnostic     | `put-request-response-scheme-arm` diagnostic                  | `arm-resource-mismatch-201` fixture                                      |
| PUT request body is `void` and response body exists                  | Supported legacy/no-body authoring; no request schema is emitted                      | no body parameter schema                                | No diagnostic  | No mapped diagnostic after this fix                           | `no-request-body` fixture; DNS corpus example                            |
| PUT request body exists and `200` response has no schema             | Already rejected by ARM response-body guidance, often suppressed in converted sources | body parameter exists, `responses[200].schema` absent   | Diagnostic     | No schema-equality diagnostic; covered by response-body rules | Marketplace and RecoveryServicesBackup examples                          |
| Empty `x-ms-arm-id-details` extension on otherwise equal resource    | Swagger extension metadata only                                                       | schemas remain equal                                    | No diagnostic  | No mapped diagnostic                                          | `empty-arm-id-details` fixture                                           |

Additional union repair coverage:

| Authored TypeSpec shape                                 | Validity/support                                                  | Emitted field or category                             | Swagger result                                                    | Native result                                           | Evidence                                                         |
| ------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- |
| Separate named open unions with identical members       | Supported named unions; compiler and HTTP metadata have no errors | String enums with different `x-ms-enum.name` metadata | One diagnostic in the comparison fixture                          | No mismatch                                             | `equivalent-open-unions`; native ARM/data-plane regression suite |
| Reordered unnamed variants with equivalent member types | Supported native unions                                           | Native semantic check; no emitted-order prediction    | Emitted enum arrays can differ by order, outside the native check | No mismatch                                             | Native suite, including one-to-one model variants                |
| Genuinely different member types, labels, or counts     | Supported native input                                            | Different native union shapes                         | Shape comparison can diagnose differences                         | Mismatch on the PUT operation                           | Native suite                                                     |
| Recursive models and recursive unnamed union members    | Supported native graph; compiler and HTTP checks pass             | No emitter invocation needed to validate recursion    | Not used as parity evidence                                       | Terminates; equal shapes pass and extra properties fail | Native suite                                                     |

Enum-member variants are also supported native input. The comparator checks
both the member label and its effective value (`value ?? name`), including
numeric values and implicit string defaults. The native suite verifies that
equal values pass and different values warn. For example, the following
compiler/HTTP-valid shape must not match:

```typespec
enum RequestValues {
  state: "active",
}
enum ResponseValues {
  state: "inactive",
}
union RequestState {
  string,
  RequestValues.state,
}
union ResponseState {
  string,
  ResponseValues.state,
}
model Request {
  state: RequestState;
}
model Result {
  state: ResponseState;
}
@put @route("/widgets") op put(@body body: Request): Result;
```

An independent review caught a draft false negative when enum members were
compared by name alone. Four native differing-value regressions failed before
the correction and pass afterward, across ARM and data-plane consumers. This
is native regression evidence, not a claim about emitted enum formatting.

### Direct enums and implicit default values

Direct enum properties use the same effective-value comparison as individual
enum-member types. A second source repair fixes the inconsistent whole-enum
branch, which previously compared raw `undefined` with an equal explicit
string default:

```typespec
enum RequestState {
  state,
}
enum ResponseState {
  state: "state",
}
model Request {
  state: RequestState;
}
model Result {
  state: ResponseState;
}
@put @route("/widgets") op put(@body body: Request): Result;
```

Both member labels and effective values are `state`. The compiler/HTTP-native
suite reproduced six false warnings across ARM and data-plane consumers
before the repair; all pass after both enum comparison paths reuse one helper.
Controls cover reversed implicit/explicit operands, reordered members, shared
enum identity, unequal labels and member counts, unequal string/numeric values,
and the distinction between explicit `0` or `""` and an implicit default.
No emitter metadata is used to establish this native equivalence.

This supported shape is covered by the native regressions rather than an
assertion of Swagger parity: different declaration names can still produce
the already-documented SDK enum-name discrepancy.

The final full-corpus rerun after this repair retained exactly the preceding
run's native and validator diagnostic records and project statuses, not merely
their aggregate totals. The existing operation-level explanations below still
apply. The six RED regressions and 68 passing native tests establish the
direct-enum correction; the unchanged corpus is observational regression
evidence, not proof that its projects contain that shape.

### Indexers with named properties and derived scalars

The third source repair closes two native semantic misses found during promotion
review. Both were present in the identical source and official comparator, not
introduced by the promotion adaptation.

```typespec
model Request is Record<unknown> {
  extra: string;
}
model Result is Record<unknown> {
  extra: int32;
}
@put @route("/widgets") op put(@body body: Request): Result;
```

The equal `string` keys and `unknown` values previously caused an early return,
ignoring the incompatible named `extra` property. Indexer comparison now rejects
unequal indexers but continues through named and inherited properties when the
indexers match. This is compiler/HTTP-valid authoring. The independent
`arm-no-record` warning discourages records for new ARM APIs; its documented
suppression policy permits them when matching an existing API, so it does not
make this shape impossible or replace schema equality.

```typespec
namespace A {
  scalar Value extends string;
}
namespace B {
  scalar Value extends int32;
}
model Request {
  value: A.Value;
}
model Result {
  value: B.Value;
}
@put @route("/widgets") op put(@body body: Request): Result;
```

These scalars have the same name but incompatible bases. Scalar equality now
compares names recursively through the base chain, retaining the existing native
name requirement and detecting differences beyond the immediate base. This is
native type comparison, not reconstruction of emitted scalar schemas or formats.

| Native shape                                                           | Before repair   | After repair | Support/evidence                                                                 |
| ---------------------------------------------------------------------- | --------------- | ------------ | -------------------------------------------------------------------------------- |
| Equal indexers, different named property types, optionality, or counts | Missed mismatch | Mismatch     | Native cases for both rule audiences; legacy ARM record suppression policy above |
| Equal indexers and equivalent named or recursive properties            | No mismatch     | No mismatch  | Native compliant controls                                                        |
| Unequal indexers, one-sided indexers, or unequal array element types   | Mismatch        | Mismatch     | Native regression controls                                                       |
| Same scalar name with incompatible direct or deeper bases              | Missed mismatch | Mismatch     | Compiler/HTTP-valid scalar regressions                                           |
| Same scalar name and equivalent independently declared base chains     | No mismatch     | No mismatch  | Native compliant controls                                                        |
| A scalar shadowing a standard scalar's name with an incompatible base  | Missed mismatch | Mismatch     | Native regression in both audiences                                              |

The complete updated native test file reproduced **18 missing-diagnostic
assertions with 88 passing controls before the fix**, then passed **106/106**
after it. These cases use native compiler/HTTP semantics without emitting
OpenAPI. They establish the repair independently of corpus cardinality and do
not expand the claim of Swagger equivalence.

The representative corpus command on `2026-09-16` selected exactly one project
using the literal filter `ProviderHub.Management`, at the same pinned specs
commit. The project compiled successfully with 226 diagnostics across all
enabled rules. The runner then failed while opening
`packages/typespec-lintdiff/specs/typespec-results.json` for output, ending
with exit 1 at `2026-09-16T08:38:47.5231367Z`. The file was subsequently
readable, not read-only, and disk space was available; the cause is not
established. This is an output/harness failure, not a proven semantic
regression. That attempt stopped before a full run. Partial generated
outputs were archived outside Git and the generated baseline restored.

The explicitly authorized recovery used a byte-identical dataset copy outside
the Git worktree and the runner's existing `--output` argument. The ProviderHub
sample succeeded, followed by a full 468-project run: 462 succeeded and the same
six projects failed compilation. The ARM rule retained all prior diagnostic
records (153 diagnostics over 34 successful projects); the shared data-plane
consumer also retained its prior three native diagnostics exactly. These are
rule-local comparisons: the source branch separately incorporated an upstream
`ConsistentResponseSchemaForPut` change before recovery, so unrelated aggregate
diagnostic changes are not attributed to this repair. The successful isolated
run establishes the current validation result, not the original file failure's
historical cause.

## Project-set comparison over aligned population

- **Aligned scope:** production ARM run, selected latest API version per dataset project, successful TypeSpec projects only.
- **Validator projects:** 36.
- **TypeSpec projects:** 34.
- **Overlap:** 34.
- **Validator-only projects:**
  - `specification/marketplace/resource-manager/Microsoft.Marketplace/Marketplace` (`2025-01-01`)
  - `specification/recoveryservicesbackup/resource-manager/Microsoft.RecoveryServices/RecoveryServicesBackup` (`2026-05-31-preview`)
- **TypeSpec-only projects:** none after the `void` body fix.
- **Compile failures excluded from aligned behavior:** `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`, `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`, `specification/network/resource-manager/Microsoft.Network/Network/Network`, `specification/quota/resource-manager/Microsoft.Quota/Quota`, `specification/resources/resource-manager/Microsoft.Resources/deployments`, `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`.

## Diagnostic cardinality

| Identity                                                          | Count |
| ----------------------------------------------------------------- | ----: |
| Validator raw diagnostics, all result shards                      |   212 |
| Validator raw identity (`project + swaggerFile + JSON path`)      |   192 |
| Validator file-independent identity (`project + JSON path`)       |   168 |
| TypeSpec raw diagnostics, all result shards after fix             |   160 |
| TypeSpec source identity (`project + sourceFile + line + column`) |   160 |
| Comparable successful-project validator diagnostics               |   160 |
| Comparable successful-project TypeSpec diagnostics                |   153 |

Within the 36 raw overlapping projects, 31 have equal counts. Validator is
higher in four projects by 51 diagnostics in total; TypeSpec is higher in one
project by one diagnostic. The two validator-only diagnostics account for the
remaining difference: `51 - 1 + 2 = 52` (212 versus 160). Network alone
contributes 45 of the 51 excess overlapping diagnostics (47 versus 2), but is
excluded from the successful-project comparison.

Within the 34 successful overlapping projects, 30 have equal counts. Validator
is higher in Automation (22/21), HDInsight (5/1), and SQL (8/7), totaling six
extra diagnostics; TypeSpec is higher in Batch (1/2), by one. Adding the two
validator-only diagnostics gives `6 - 1 + 2 = 7` (160 versus 153). These
cardinalities use different identity domains and are not an equivalence proof.

Conservative deduplication leaves the successful-project counts unchanged.
Across all raw projects, retaining Swagger file identity reduces 212 to 192
diagnostics; dropping file identity reduces that to 168. The corresponding
overlap positive/negative differences are 31/1 and 7/1, respectively, with 31
equal-count overlapping projects in both cases. All 160 native raw diagnostics
have distinct project/source-file/line/column identities. The successful
population has 160 distinct Swagger identities under either deduplication and
153 distinct native source identities, so its residual seven-diagnostic gap is
not removed by either conservative identity.

## Gap example: no request body emitted

- **Classification:** TypeSpec-only before fix
- **Status:** fixed
- **Project/API version:** `specification/dns/resource-manager/Microsoft.Network/Dns` / `2023-07-01-preview`
- **Source:** `DnssecConfig.tsp`, `DnssecConfigs.createOrUpdate`

**TypeSpec source**

```typespec
createOrUpdate is Azure.ResourceManager.Legacy.CreateOrReplaceAsync<
  DnssecConfig,
  Request = void,
  Parameters = { @header("If-Match") IfMatch?: string; },
  LroHeaders = ArmLroLocationHeader<FinalResult = DnssecConfig> &
    Azure.Core.Foundations.RetryAfterHeader,
  Error = CloudError
>;
```

**Emitted OpenAPI or validator behavior**

```json
{
  "operationId": "DnssecConfigs_CreateOrUpdate",
  "parameters": [
    { "$ref": ".../ApiVersionParameter" },
    { "name": "If-Match", "in": "header", "type": "string" }
  ],
  "responses": {
    "200": { "schema": { "$ref": "#/definitions/DnssecConfig" } },
    "201": { "schema": { "$ref": "#/definitions/DnssecConfig" } }
  }
}
```

| Engine            | Observed result                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Swagger validator | No diagnostic because `putRequestResponseScheme` finds no `in: body` parameter and returns early.                                                                  |
| TypeSpec lint     | Before this fix, HTTP metadata exposed `void` as a body type and the rule compared it with `DnssecConfig`; after this fix, `void` is skipped as no request schema. |

**Explanation:** `Request = void` is the TypeSpec representation for an operation without an emitted body parameter. Comparing `void` to the response model was broader than the Swagger rule.

**Disposition:** rule fix and `no-request-body` regression fixture.

## Gap example: equivalent open unions and SDK enum names

- **Classification:** validator-only in the focused comparison fixture
- **Status:** native false positive fixed; emitted SDK-name difference intentional
- **Project/API version:** `equivalent-open-unions` fixture / `2024-01-01`
- **Source:** `Widgets.createOrUpdate`, `RequestState`, and `ResponseState`

**TypeSpec source**

```typespec
union RequestState {
  string,
  active: "active",
  inactive: "inactive",
}
union ResponseState {
  string,
  active: "active",
  inactive: "inactive",
}
```

The request and response resource properties use these separately declared
unions. The members have the same native types and labels, but the compiler
allocates a different symbol key for each unnamed `string` variant. Before
source repair, looking up that key in the other union incorrectly reported a
PUT mismatch. Native regression tests reproduce the false positive without an
emitter and verify same-union, genuinely different-member, recursion, operation
target, `200`/`201`, and absent-body controls for both consumers.

**Emitted OpenAPI or validator behavior**

The fixture's `output.json` records otherwise equivalent enum definitions with:

```json
{
  "RequestState": {
    "type": "string",
    "enum": ["active", "inactive"],
    "x-ms-enum": { "name": "RequestState", "modelAsString": true }
  },
  "ResponseState": {
    "type": "string",
    "enum": ["active", "inactive"],
    "x-ms-enum": { "name": "ResponseState", "modelAsString": true }
  }
}
```

This excerpt omits identical descriptions and `x-ms-enum.values` entries.
The validator's recursive `isSchemaEqual` compares the differing enum names
after reference resolution and reports one warning, although the native
property types have the same shape. Predicting that SDK metadata is outside
the native contract.

| Engine               | Observed result                                                                 |
| -------------------- | ------------------------------------------------------------------------------- |
| Swagger validator    | One `PutRequestResponseSchemeArm` finding for the emitted enum-name difference. |
| Native TypeSpec lint | No schema-equality warning after structural matching of unnamed variants.       |

**Disposition:** compare unnamed members by native type, independently of their
symbol keys and order, with one-to-one matching and isolated recursive
comparison state. Keep named-variant name/type checks unchanged. Record the
validator discrepancy explicitly in the fixture expectation rather than
simulating emitted enum names or claiming exact Swagger equivalence.

## Gap example: response schema missing

- **Classification:** validator-only
- **Status:** intentional native-contract boundary
- **Project/API version:** `specification/marketplace/resource-manager/Microsoft.Marketplace/Marketplace` / `2025-01-01`
- **Source:** `PrivateStore.tsp`, `PrivateStores.createOrUpdate`

**TypeSpec source**

```typespec
#suppress "@azure-tools/typespec-azure-resource-manager/no-response-body" "FIXME: Update justification, follow aka.ms/tsp/conversion-fix for details"
createOrUpdate is Azure.ResourceManager.Legacy.CreateOrReplaceSync<
  PrivateStore,
  BaseParameters = Azure.ResourceManager.Foundations.TenantBaseParameters,
  Response = OkResponse,
  Error = ErrorResponse,
  OptionalRequestBody = true
>;
```

**Emitted OpenAPI or validator behavior**

```json
{
  "operationId": "PrivateStore_CreateOrUpdate",
  "parameters": [
    {
      "name": "payload",
      "in": "body",
      "required": false,
      "schema": { "$ref": "#/definitions/PrivateStore" }
    }
  ],
  "responses": {
    "200": { "description": "The request has succeeded." }
  }
}
```

| Engine            | Observed result                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Diagnostic: request model `parameters[2].schema` differs from missing `responses[200].schema`.                                                                                |
| TypeSpec lint     | No `put-request-response-scheme-arm` diagnostic because no response body schema exists to compare; ARM `no-response-body` is the native rule for this invalid response shape. |

**Explanation:** The Swagger helper treats an absent response schema as `{}` and reports this rule. Native TypeSpec keeps response-body absence separate from request/response schema equality; converted sources may suppress `no-response-body`, but reproducing that suppression-sensitive overlap here would conflate two rules.

**Disposition:** intentional parity gap for already-invalid/suppressed response-body absence; no additional schema-equality implementation.

### The same boundary explains six occurrences in overlapping projects

Compiler/HTTP probes joined validator paths by exact path equality and native
diagnostics by source-file/line/column identity, without fuzzy operation-name
matching. All three projects compile without errors, and all six endpoints
exist in both source and selected-version HTTP graphs. Each has a non-void
request body and a bodyless preferred `200` response; the real shared helper
returns `undefined` before type comparison.

| Project / selected API version   | Source target                                                                  | Extra validator occurrences |
| -------------------------------- | ------------------------------------------------------------------------------ | --------------------------: |
| Automation / `2024-10-23`        | `DscNodeConfiguration.tsp:45`, `DscNodeConfigurations.createOrUpdate`          |                           1 |
| HDInsight / `2025-01-15-preview` | `routes.tsp:278,200,240,160`, four distinct extension PUT routes               |                           4 |
| SQL / `2025-02-01-preview`       | `MaintenanceWindows.tsp:57`, `MaintenanceWindowsOperationGroup.createOrUpdate` |                           1 |

The HDInsight paths end in `extensions/{extensionName}`,
`extensions/azureMonitor`, `extensions/azureMonitorAgent`, and
`extensions/clustermonitoring`. These are real distinct endpoints, not
duplicate findings or absent native declarations. SQL's unmatched path ends in
`maintenanceWindows/current`; it is not `DatabaseExtensions_CreateOrUpdate`.

For example, the Automation operation explicitly selects a bodyless `200`
alongside a typed `201`:

```typespec
createOrUpdate is Azure.ResourceManager.Legacy.CreateOrUpdateAsync<
  DscNodeConfiguration,
  Request = DscNodeConfigurationCreateOrUpdateParameters,
  Response =
    | OkResponse
    | ArmResourceCreatedResponse<
        DscNodeConfiguration,
        ArmLroLocationHeader<FinalResult = DscNodeConfiguration> &
          Azure.Core.Foundations.RetryAfterHeader
      >
>;
```

All six emitted `200` response objects are:

```json
{ "description": "The request has succeeded." }
```

The validator selects `200` whenever that response object exists, even when
its schema is absent; it does not fall back to Automation's typed `201`.
It compares the request schema with `{}`. The native helper selects the same
status, but has no response body type to compare. Together with Marketplace
and RecoveryServicesBackup, this accounts for eight validator-only occurrences.
No additional equality-rule change is required for these documented
response-body boundaries.

## Gap example: compile-failure-only raw diagnostics

- **Classification:** count-only
- **Status:** population mismatch
- **Project/API version:** `specification/network/resource-manager/Microsoft.Network/Network/Network` / `2025-07-01`
- **Source:** refreshed TypeSpec corpus status

**TypeSpec source**

```text
TypeSpec corpus compile status: failed
raw validator diagnostics for PutRequestResponseSchemeArm: 47
raw TypeSpec diagnostics for put-request-response-scheme-arm before failure: 2
```

**Emitted OpenAPI or validator behavior**

```text
The retained Swagger files for `2025-07-01` validated successfully in the dataset,
but the refreshed TypeSpec compile command failed and the project is excluded from
`coverage-breakdown.md` successful-project counts.
```

| Engine            | Observed result                                                             |
| ----------------- | --------------------------------------------------------------------------- |
| Swagger validator | 47 raw diagnostics in the by-rule shard.                                    |
| TypeSpec lint     | Project excluded from aligned coverage because TypeSpec compilation failed. |

**Explanation:** Raw by-rule shards preserve diagnostics outside the successful TypeSpec population. The coverage row correctly excludes this project from behavioral comparison.

**Disposition:** population mismatch, not a rule change.

## Focused validation

`mise exec -- pnpm --dir packages/typespec-lintdiff validate --rule PutRequestResponseSchemeArm` passes with seven test cases:

- 3 violation fixtures covered by direct TypeSpec diagnostics.
- 3 compliance fixtures with reviewed ambient diagnostics.
- 1 native compliance fixture with a reviewed Swagger SDK enum-name discrepancy.
- 0 unresolved fixture gaps.

The shared native suite `test/rules/put-request-response-scheme.test.ts` passes
106 tests across ARM and data-plane consumers without importing an emitter.
The data-plane `PutRequestResponseScheme` comparison command also exits
successfully with four fixtures; its legacy `put-schema-match` compliance case
still has unreviewed ambient diagnostics, so it is not claimed as a clean native
compliance proof. The dedicated native union controls provide that proof for
this repair.

The no-request-body ARM fixture retains the target branch's new
`patch-properties-correspond-to-put-properties` warning as explicitly reviewed
ambient evidence. This warning concerns that fixture's PATCH operation and was
not introduced by the union fix; the PATCH rule was not changed or suppressed.

## Gap example: removed Batch certificate operation

- **Classification:** count-only, TypeSpec-higher by one.
- **Status:** population mismatch.
- **Project/API version:** `specification/batch/resource-manager/Microsoft.Batch/Batch` / `2025-06-01`.
- **Source:** `Certificate.tsp`, deprecated `create` operation, native diagnostic at line 69.

**TypeSpec source**

The certificate create operation is explicitly removed from the selected
version:

```typespec
@removed(Versions.v2025_06_01)
```

The operation instantiates `Azure.ResourceManager.Legacy.CreateOrReplaceAsync`
with `Certificate` and `Request = CertificateCreateOrUpdateParameters`.

**Version-selection evidence**

The retained Swagger is `swagger/stable/2025-06-01/openapi.json`. Its one
validator finding is `BatchAccount_Create`; the unprojected native findings are
at `BatchAccount.tsp:44` and `Certificate.tsp:69`.

| Engine            | Observed result                                                              |
| ----------------- | ---------------------------------------------------------------------------- |
| Swagger validator | One finding; the removed certificate create is outside the selected version. |
| TypeSpec lint     | Two findings in the source program, including the older certificate create.  |

**Explanation:** successful compilation does not align API-version populations.
The corpus's 153 native diagnostics include this one known older-version
diagnostic. Removing it for latest-version attribution leaves 152; retain the
raw 153 count separately rather than claiming that successful-project filtering
alone yields an exactly version-aligned comparison.

**Disposition:** exclude the certificate finding from selected-version
attribution, not from production linting of the full source program. No rule
change is required for this population difference.

## Final assessment

The repaired rule implements the tested native contract for ARM PUT request
body versus primary success response body equality, including `200` selection,
`201` fallback, structural open-union comparison, recursion, and no-request-body
behavior. It is not exactly equivalent to Swagger: it intentionally does not
compare missing response schemas as `{}` or predict emitted SDK enum metadata.
Unchanged corpus counts do not prove the union repair; the native regressions
and explicit comparison fixture do.
