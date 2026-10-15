# XMSLongRunningOperationProperty migration

## Result and gap summary

The completed full run reports six production Swagger findings and six native
TypeSpec findings in the same three projects. There is no observed count gap or
one-sided project. The compared corpus has 462 successfully compiled ARM projects
out of 468; six unchanged compile failures remain unassessed. The findings match
operations in the dataset-selected latest API versions.

The implementation update is complete. It replaces output-extension compliance
with native polling metadata, corrects nested ARM service isolation, and prevents
duplicate operation checks. Native tests and 52 focused comparison cases prove
these decisions.

Exact Swagger equivalence remains intentionally partial: a true output-only
`x-ms-long-running-operation` override does not supply native polling metadata.
Comparison fixtures prove that divergence. Corpus overlap does not establish
universal equivalence, and the six compile exclusions limit the assessed
population. There is no unexplained discrepancy in the assessed rule results.

## Source and compared populations

- Specs revision: `f6b53f105b95da05276530a0754a1c71b4f16397`.
- Development starting commit: `b2f6e6bdc8ed1298d53c579740bef1f306836607`.
- [External report snapshot](../../../docs/coverage_old.md) credits migration
  dispositions over 450 compiled projects and 210 rules. It does not record its
  specs revision, generation timestamp, or per-project findings. Its aggregate
  row cannot identify unmatched services.
- [Retained observed report](../../../specs/coverage-breakdown.md) uses the pinned
  specs revision and reports 462 successfully compiled projects out of 468.
  Its TypeSpec shard was generated on `2026-08-10T09:38:18.108Z`.
- Retained Swagger results were generated on `2026-08-06T08:03:27.940Z` by
  `test/harness/spec-dataset.ts`, with production ARM validation and no readme
  suppressions. The dataset originally emitted all 468 projects; behavioral
  comparison excludes subsequent TypeSpec compile failures from both engines.
- The retained Swagger population is the dataset-selected latest API version.
  Ordinary TypeSpec diagnostics can cover all declared versions. Raw TypeSpec
  counts and selected-version attribution must be kept separate when a project
  appears only on the TypeSpec side.

### Retained report reconciliation

| Report                            | Category/mode                      | Validator projects | TypeSpec projects | Official credit |                   Overlap | Validator-only  | TypeSpec-only   | Diagnostics: validator / TypeSpec |
| --------------------------------- | ---------------------------------- | -----------------: | ----------------: | --------------: | ------------------------: | --------------- | --------------- | --------------------------------- |
| External snapshot                 | `lint`, execution mode unspecified |                  3 |                 3 |               0 | not individually recorded | not recoverable | not recoverable | not recorded                      |
| Observed report before this draft | `lint`, production                 |                  3 |                 3 |               0 |                         3 | 0               | 0               | 6 / 6                             |

The report denominators differ, but this rule's retained project totals agree.
The external report credits a migration disposition; the observed report credits
same-project diagnostic overlap. Neither an aggregate percentage nor matching
raw counts establishes semantic completeness.

## Latest full-corpus evidence

The representative `Advisor` literal filter selected one project and completed
successfully before the full run. The full existing runner then processed all
468 projects, with concurrency six and no filter or limit:

```powershell
mise exec -- pnpm --dir packages\typespec-lintdiff specs:typespec --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-xms-long-running-operation-property --concurrency 6
```

The run exited zero. Its final TypeSpec shard timestamp is
`2026-10-13T11:11:13.451Z`; measured compilation, aggregation, and report time is
1,258,511 ms. The final index declares `partial: false`, 468 processed projects,
six failed projects, and 60,354 diagnostics across all rules. The six failure
identities match the captured pre-run report.

### Rule counts and project comparison

| Population                              | Validator | Native TypeSpec |
| --------------------------------------- | --------: | --------------: |
| Raw target-rule findings                |         6 |               6 |
| Distinct occurrences / authored targets |         6 |               6 |
| Affected successfully compiled projects |         3 |               3 |
| Same-project overlap                    |         3 |               3 |
| One-sided projects                      |         0 |               0 |

Validator occurrences are distinct by project, Swagger file, and JSON path.
Native targets are distinct by project, source file, line, and column. No
duplicate occurrence changes either count. The native diagnostic unit remains
the operation, not a globally deduplicated header declaration.

The complete overlap is:

| Dataset project `sourcePath`                                          | Selected API version | Validator / native | Authored evidence                                                                                                                                 |
| --------------------------------------------------------------------- | -------------------- | -----------------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `specification/advisor/resource-manager/Microsoft.Advisor/Advisor`    | `2026-03-01-preview` |              1 / 1 | `routes.tsp:124`, `generate` sync provider action with plain 202 `Location`                                                                       |
| `specification/help/resource-manager/Microsoft.Help/Help`             | `2024-03-01-preview` |              3 / 3 | `TroubleshooterResource.tsp:51,64,76`, `continue`, `end`, and `restart` sync extension actions with plain `location`                              |
| `specification/keyvault/resource-manager/Microsoft.KeyVault/KeyVault` | `2026-03-01-preview` |              2 / 2 | `PrivateEndpointConnection.tsp:72` and `MhsmPrivateEndpointConnection.tsp:77`, sync PUT response customizations with plain `Azure-AsyncOperation` |

Complete validator-only list: **empty**. Complete TypeSpec-only list: **empty**.
The six authored headers correspond to the six selected-version Swagger
operations. The selected-version comparison therefore retains all six findings;
no older-version-only finding is excluded. Native output is not generally
version-projected, and this attribution does not claim all-version parity.
There is no TypeSpec-only project requiring additional selected-version
projection in this run.

### Compile exclusions

These projects are excluded from behavioral comparison, not counted as clean.
Their compiler errors also appear in the captured pre-draft outputs. None has an
`XMSLongRunningOperationProperty` finding in the retained validator shard.

| Unassessed dataset project                                                                               | Observed compiler error                                           |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices` | `@typespec/http/duplicate-body`, `client.tsp:469`                 |
| `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`                  | `@typespec/http/missing-uri-param`, legacy ARM operation template |
| `specification/network/resource-manager/Microsoft.Network/Network/Network`                               | `@typespec/http/missing-uri-param`, legacy ARM operation template |
| `specification/quota/resource-manager/Microsoft.Quota/Quota`                                             | `@typespec/http/missing-uri-param`, legacy ARM operation template |
| `specification/resources/resource-manager/Microsoft.Resources/deployments`                               | `@typespec/http/duplicate-body`, legacy ARM operation template    |
| `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`                     | `@typespec/http/duplicate-body`, `client.tsp:195`                 |

No unrelated production rule or baseline compiler error was repaired for this
migration. Full raw outputs, the pre-run inventory, final rule shard, comparison,
and cleanup archive are retained as task evidence outside the publication diff.

### Real-service example: plain header without polling metadata

Advisor's `generate` operation uses a synchronous template with a plain header:

```typespec
@action("generateRecommendations")
generate is ArmProviderActionSync<
  Scope = SubscriptionActionScope,
  Parameters = {},
  Response = ArmAcceptedResponse & {
    @header("Location")
    Location: string;
  },
  Error = ArmDefaultErrorResponse
>;
```

The excerpt retains the actual template and response customization while
omitting documentation and unrelated annotations. The selected
`2026-03-01-preview` Swagger POST
`/subscriptions/{subscriptionId}/providers/Microsoft.Advisor/generateRecommendations`
contains `responses.202.headers.Location` without a true LRO marker. Swagger
reports that header; the native rule reports `routes.tsp:124:7` because the
operation has no supported polling metadata. This is a real violating
customization, not a validator false positive or an emitted duplicate.

## Official coverage check

This rule is an actionable native gap, not wholly template-enforced.

- Azure Core's `long-running-polling-operation-required`
  (`src/rules/lro-polling-operation.ts`) checks `Operation-Location` and a linked
  polling operation. It does not check ARM's `Location` or
  `Azure-AsyncOperation` headers.
- ARM's registered `lro-location-header` checks for a missing `Location` header on
  a 202 response. It does not require polling metadata when a header exists.
- The ARM RPC coverage table maps the related `RPC-Async-V1` header-presence
  requirement to `lro-location-header`; it does not establish coverage of the
  reverse implication in `RPC-Async-V1-15`.
- Standard async templates provide native metadata by default, but supported sync
  templates accept arbitrary response customizations. Async templates can also
  replace semantic polling headers with plain header properties. Both violations
  are exercised by native tests and the existing `LroExtension` fixtures.
- Neither official rule directory contains a direct `LintDiff Equivalent`
  mapping for `XMSLongRunningOperationProperty`. Registration and implementation,
  rather than this absence alone, establish the uncovered check.

## Native implementation contract

The intended guideline is: ARM PUT/PATCH/POST/DELETE success responses that expose
`Location` or `Azure-AsyncOperation` must have a supported polling contract.

The implementation reads HTTP metadata through `getHttpService` and polling
metadata through Azure Core's `getLroMetadata`. Production code does not import
an emitter, TCGC, or `@typespec/openapi`, read extensions, or simulate emission.
Native tests do not load an emitter or use extensions to implement compliance.
The test host registers OpenAPI only as an Azure library prerequisite.

The lintdiff mixed-rule runner requires ARM service isolation. It uses
`getArmProviderNamespace` on each service, following the sibling `lro-extension`
pattern. Promotion to the ARM package should remove that lintdiff-only isolation
and rely on the ARM ruleset audience. `resolveProviderNamespace` was not an
appropriate ancestor test: `namespace.ts` implements a descendant search.

The diagnostic unit is one operation. The authored target remains its first
qualifying header property, with status preference `200`, `201`, `202`, `204`.
Header names are case-insensitive. Shared response declarations can receive one
finding for each offending operation. A visited-operation set prevents duplicate
findings when services overlap.

The rule does not check GET/HEAD, unrelated headers, other status codes, or
output-only overrides. Supported templates and response models/unions are
resolved by the HTTP API; no custom response-model traversal is introduced.

## Supported shape and emission matrix

This is research evidence, not an emitter implementation checklist. Header
serialization uses the HTTP response metadata consumed by AutoRest;
`getLroMetadata` supplies the supported long-running decision.

| Authored shape                                                                | Validity/support                                                                                    | Selected header field / LRO marker                    | Swagger result                         | Native result                                       | Evidence                                                                         |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| Sync resource POST, customized 200 response with plain `Location`             | Supported ARM template customization                                                                | `Location: string`; marker absent                     | Finding                                | Finding on header                                   | `missing-lro-extension` source/output/diagnostic snapshots                       |
| Sync resource POST, customized 204 response with plain `Azure-AsyncOperation` | Supported ARM template customization                                                                | `Azure-AsyncOperation: string`; marker absent         | Finding                                | Finding on header                                   | `missing-azure-asyncoperation-header` snapshots                                  |
| Sync resource POST with no polling header                                     | Supported ARM template customization                                                                | Selected field absent                                 | None                                   | None                                                | `no-async-headers` snapshots                                                     |
| Standard async PUT/PATCH/DELETE                                               | Supported ARM templates                                                                             | Semantic polling header present; marker true          | None                                   | None                                                | `compliant-with-template` snapshots                                              |
| Async provider POST with `LroHeaders = PlainLocationHeaders`                  | Supported ARM template customization                                                                | Plain `Location` present; marker absent               | Finding                                | Finding                                             | `LroExtension/provider-async-plain-location` source/output and native regression |
| Standard async provider POST                                                  | Supported ARM template                                                                              | Semantic `Location` present; marker true              | None                                   | None                                                | `LroExtension/provider-semantic-location` snapshots and native regression        |
| PUT 201 / PATCH 202 / POST 200 / DELETE 204 with plain qualifying headers     | Valid native HTTP shapes; template variants above represent ARM authoring                           | Case-insensitive selected header; no polling metadata | Finding by validator selector/function | Finding on exact property                           | Four native predicate tests and upstream tests                                   |
| GET/HEAD, 203/400, `Operation-Location`, or `Retry-After` alone               | Valid native HTTP boundary inputs                                                                   | Field outside selected verb/status/header set         | None for this validator                | None for this rule                                  | Six native boundary tests and validator selector/function                        |
| Two qualifying response models, or shared response declaration                | Valid native HTTP models/unions                                                                     | First qualifying header by status order               | One finding per emitted operation      | One finding per operation, including shared targets | Native exact-target/count tests; validator returns first match                   |
| Ad hoc POST with explicit output extension true and plain 202 `Location`      | Research-only: requires `no-openapi` and nonstandard POST-response suppressions in existing fixture | Header present; explicit marker true                  | None                                   | Finding: metadata absent                            | `LroExtension/with-lro-extension` source/output/diagnostic snapshots             |

The final row is deliberately outside clean native authoring. It does not justify
an OpenAPI-dependent production exemption. The rule does not claim to validate
every Swagger-only extension arrangement or invalid emitted shape.

## Focused validation

The native suite has 19 tests covering the four qualifying verbs/status codes,
case-insensitive header names, six exclusion cases, first-header selection,
shared header targets, lintdiff service isolation, overlapping services, and
supported template customizations with and without polling metadata.

Both actual documentation snippets in `rule.md` are compiled by native tests
using the same service/import setup. The incorrect
`ArmProviderActionSync<Request = void, Response = Response>` example emits one
finding on `Response.location`. The corrected
`ArmProviderActionAsync<Request = void, Response = void>` example retains a
qualifying semantic header and emits no finding; it does not merely avoid the
header predicate.

Focused comparison validation passes:

- `XMSLongRunningOperationProperty`: four cases, two covered violations and two
  compliant cases with exact reviewed ambient diagnostics.
- `LroExtension`: ten affected cases, four violations with that rule's existing
  partial coverage classification, four validator-clean compliance cases, and
  two retained reviewed validator discrepancies. There are no unresolved gaps
  or ambient proof mismatches.
- `ConsistentPatchProperties`: 23 cases. Its five mapped-diagnostic warnings in
  validator-clean cases are review warnings, not validation failures. The writer
  and strict checks both exit zero.
- `DeleteResponseCodes`: seven cases; `LroErrorContent`: six cases;
  `LongRunningOperationsOptionsValidator`: one case;
  `LroPostMustNotUseOriginalUriAsFinalState`: one case.

All seven affected groups pass snapshot-writer and strict validation, covering
52 cases. Harness-owned snapshots are not reformatted.

The resource action fixtures now use supported `ArmResourceActionSync` response
customizations. Emitted OpenAPI is unchanged. Template instantiation exposes one
additional existing `path-parameter-schema` warning, so the no-header compliance
fixture's reviewed ambient count changes from ten to eleven. This is fixture
adaptation, not a change to that other rule.

## Gap example: output-only extension is not polling metadata

- **Classification:** TypeSpec-only, comparison fixture.
- **Status:** intentional native-contract difference.
- **Project/API version:** `LroExtension/with-lro-extension` / `2024-01-01`.
- **Source:** `main.tsp`, `Widgets.startWidget` and `StartWidgetResponse.location`.

The existing research fixture contains:

```typespec
@extension("x-ms-long-running-operation", true)
@post
startWidget(...ResourceInstanceParameters<Widget>): StartWidgetResponse | ErrorResponse;

model StartWidgetResponse {
  @statusCode statusCode: 202;
  @header("Location") location?: string;
}
```

It explicitly suppresses Azure Core `no-openapi` and the nonstandard ARM POST
response warning. These are not recommended authoring patterns.

The verified emitted operation contains:

```json
{
  "operationId": "Widgets_StartWidget",
  "responses": {
    "202": {
      "headers": {
        "Location": {
          "type": "string",
          "description": "The location header."
        }
      }
    }
  },
  "x-ms-long-running-operation": true
}
```

This excerpt omits unrelated operation fields.

| Engine              | Observed result                                                                     |
| ------------------- | ----------------------------------------------------------------------------------- |
| Swagger validator   | No finding: its function immediately accepts the true marker.                       |
| Updated native lint | One finding on the plain header: `getLroMetadata` cannot resolve polling semantics. |

**Explanation:** An output marker says the operation is long-running but does
not supply the native polling contract. The old local exemption read this marker
through prohibited OpenAPI APIs.

**Disposition:** Remove the exemption, preserve this research fixture, and
review its additional ambient finding without changing its separate
`LroExtension` compliance semantics. The old failed ambient-proof receipt and
the corrected passing receipts are retained in the task artifacts.

`ConsistentPatchProperties/async-get-fallback` demonstrates the same difference:
its PATCH response supplies a plain 202 `Location` header and explicit output
extensions, with a `no-openapi` suppression. The updated native rule reports one
ambient finding on that header. Its separate PATCH-property mapping, assertions,
and suppressions remain unchanged. The expected ambient count is one; its writer
and strict reruns both pass over the original 23-case group.

## Required changes and conclusion

The TypeSpec rule update is completed: use supported native metadata, correct
service isolation, and prevent duplicate checks across overlapping services.
Directly related native tests, template fixtures, snapshots, documentation, and
the explained neighboring ambient expectations are updated.

The native contract is covered by focused tests. Exact executable Swagger parity
is intentionally partial because output-only overrides are not native metadata.
The completed full corpus shows matching six-operation findings in three
projects, with no unexplained assessed gap. Functional agreement is established
for those observed operations and the supported native test matrix, not for all
Swagger extension arrangements, all historical versions, or the six uncompiled
projects. Independent review and publication remain separate workflow gates.
