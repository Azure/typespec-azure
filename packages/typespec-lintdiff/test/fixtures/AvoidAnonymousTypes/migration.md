# AvoidAnonymousTypes migration

## Result and gap summary

The full 468-project ARM run compiled **462 projects**: **10 validator diagnostics
in seven projects**, versus **one native diagnostic in one different project**;
overlap is zero. The ten findings concern three response dictionaries, three
nested dictionaries, and four dictionary-valued properties literally named
`additionalProperties`. The native extra is an SDK override declaration, not an
older API version.

**Rule update completed:** implicit response checks retain original targets, cover
intersections, deduplicate shared declarations, and avoid duplicating Azure Core's
explicit-body checks. A consistent metadata filter accepts complete named-model
spreads, including mixed inside/outside headers and status codes, without
suppressing added payload properties. Sixty native tests and seven comparison
fixtures establish those cases; corpus totals are observational evidence, not
universal equivalence.

Exact Swagger equivalence remains **partial**. Assessed discrepancies are explained
below. Six unchanged compile failures exclude 22 validator occurrences, whose
behavior is not assessed. The older aggregate report lacks reproducible
project-level provenance.

## Contract and official coverage gate

The original rule's intended guideline is reusable, named model types. Its
executable selectors inspect response schemas and object-valued
`additionalProperties` / `allOf` entries anywhere beneath definitions. The
predicate accepts null, `x-ms-client-name`, and schemas without nonempty
properties, additional properties, or composition.

Sources:

- [Validator selectors](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/packages/rulesets/src/spectral/az-common.ts)
- [Schema predicate](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/packages/rulesets/src/spectral/functions/avoid-anonymous-schema.ts)
- [Validator documentation](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/docs/avoid-anonymous-types.md)

Classification at development base
`a213b2d6265b16ccd1a6dff22547b5d7fa84980e`, rechecked against
`64cf4af2850f436944284fb7dbef994c4e2a081b` and publication target
`e3fcd29b245a5393beb448872f5018ddc8147c84`: **partial**.
The intervening target commits update skill instructions and consolidate
unrelated ARM PATCH-property rules. They do not change the official anonymous-type
coverage, this rule's implementation or registration, or its fixture paths.
`@azure-tools/typespec-azure-core/no-unnamed-types` is registered in Azure Core
and enabled in both official Azure rulesets. Its `modelProperty` listener checks
nonempty anonymous property types, including explicit response bodies; its
`operation` listener only excludes response unions from its union check.
It does not check implicit model-expression response bodies.
Its template-argument and HTTP-envelope exemptions are intentional existing
policy, not missing work for this supplemental rule.

The maintained ARM RPC inventory does not identify an anonymous-type RPC rule;
the validator catalog also has an empty `rpcCode`. The ARM
`arm-resource-operation-response` rule enforces matching resource identities,
not naming of arbitrary response payloads. ARM templates provide named resource
responses but do not eliminate the uncovered custom HTTP response surface.

The local rule therefore excludes property-position bodies and does not compete
with the official rule. Promotion should retain that boundary in Azure Core:
the intended authoring guideline applies to ARM and data-plane services without
a provider-namespace guard.

## Native implementation and diagnostic unit

The rule uses compiler and HTTP semantic APIs only:

1. Ignore library operation declarations and generic template declarations and
   instances.
2. Resolve HTTP responses with `getHttpOperation`.
3. Require an original anonymous model response with a nonempty
   implicit model payload; explicit body properties are outside this rule.
   Anonymous intersections are models too; no syntax-kind restriction is used.
4. Accept complete named-model spreads through `getEffectiveModelType`, which
   follows source-property identity rather than predicting schema references.
   Its supported property filter excludes `isHeader` and `isStatusCode`
   properties from both the payload and candidate named models. This preserves
   named identity whether metadata occurs inside, outside, or on both sides of
   a complete spread. Added payload properties still prevent a named match.
5. Report once per original response model identity across the program.
   Metadata stripping must not redirect the diagnostic to a synthetic model.

No emitter, OpenAPI helper, TCGC API, reference-string inference, private state,
or version mutation is used. Source semantics are checked without projecting
versions. SDK-specific override declarations remain visible; this rule does not
claim to reproduce an emitter's SDK operation filtering.

## Supported-shape and emission matrix

This is research evidence, not an emitter implementation checklist.
`packages/typespec-autorest/src/openapi.ts:getSchemaOrRef` resolves effective
payload types before its inline/reference decision; `utils.ts:shouldInline`
also considers template instances and friendly names. Neither helper is used
by the production rule.

| Authored shape                                                  | Validity / support                                                                                                                                      | Selected Swagger field and validator outcome                                          | Native outcome                                                              | Evidence                                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `op read(): { value: string }`                                  | Valid HTTP TypeSpec                                                                                                                                     | Response schema has object properties; violation                                      | One diagnostic on expression                                                | `implicit-response` fixture                                                                                   |
| Inline response with `@statusCode`, `@header`, and `value`      | Valid HTTP TypeSpec                                                                                                                                     | Metadata is removed; remaining object properties violate                              | One diagnostic on original expression                                       | `metadata-response` fixture and native tests                                                                  |
| `{ first: string } & { second: string }`                        | Valid anonymous intersection; named-model intersections are also supported                                                                              | Response schema contains merged object properties; violation                          | One diagnostic on the anonymous response model                              | `intersection-response` fixture and two native regressions                                                    |
| Named response model                                            | Valid                                                                                                                                                   | Response `$ref`; accepted                                                             | Accepted                                                                    | `compliant` fixture                                                                                           |
| `{ ...Fields }`                                                 | Valid reuse of named source                                                                                                                             | Effective payload is `Fields`, emitted as `$ref`; accepted                            | Accepted through compiler source identity                                   | `spread-response` fixture                                                                                     |
| `{ ...Fields; extra: string }`                                  | Valid new anonymous shape                                                                                                                               | Inline object with additional properties; violation                                   | Diagnostic                                                                  | Native regression; `getEffectiveModelType` rejects unsourced properties                                       |
| Explicit `@body` / `@bodyRoot` anonymous property               | Valid                                                                                                                                                   | Inline object schema can violate                                                      | Excluded here; official property-position rule owns it                      | Native controls; Azure Core `no-unnamed-types.test.ts` response-body regression                               |
| Empty model / metadata-only response / `void`                   | Valid HTTP shapes                                                                                                                                       | No response body schema, or empty object without material members; accepted           | Accepted                                                                    | Native controls; HTTP `payload.ts` body resolution                                                            |
| Scalar / array response                                         | Valid HTTP shapes                                                                                                                                       | Primitive or array schema has no own object members; accepted                         | Accepted                                                                    | Native controls; validator predicate                                                                          |
| `Record<string>`, `Record<unknown>`, nested `Record<Record<T>>` | Valid native dictionaries; ARM's separate dictionary rule may require suppression                                                                       | Inline `additionalProperties` causes validator findings                               | Not anonymous model declarations; accepted here                             | Native controls and real-service examples below                                                               |
| Named inherited / `model is` response                           | Valid                                                                                                                                                   | Named reference; named base normally appears as `$ref` in `allOf`                     | Accepted                                                                    | Native controls; emitter `getSchemaForModel` base-model branches                                              |
| Generic template declarations                                   | Non-endpoint authoring definitions                                                                                                                      | No independently emitted endpoint response                                            | Excluded                                                                    | Native controls                                                                                               |
| Alias/shared/imported anonymous expression                      | Valid                                                                                                                                                   | May appear at several emitted response occurrences                                    | One source diagnostic, targeted at the imported declaration when applicable | Native count and file/position assertions                                                                     |
| Anonymous model alternatives with distinct HTTP status codes    | Valid supported response union                                                                                                                          | Separate response schemas, each checked independently                                 | One diagnostic per distinct response model identity                         | Native distinct-response regression                                                                           |
| Multiple distinct object payloads for the same HTTP status      | HTTP can group these, but AutoRest rejects plain model unions with `union-unsupported`, or distinct grouped envelope bodies with `duplicate-body-types` | No valid emitted comparison population; any partial output is not compliance evidence | Outside the supported contract; no complete-variant coverage claim          | HTTP `responses.ts:resolveResponseVariants`; AutoRest `openapi.ts:getSchemaForUnion` and `emitResponseObject` |
| `x-ms-client-name` / schema extension overrides                 | Emitter-specific override, not native naming                                                                                                            | Validator explicitly exempts the extension                                            | Not consulted                                                               | Validator predicate and native dependency boundary                                                            |
| Named model inheriting a generic dictionary base                | Named native model; generic base emission differs from ordinary named inheritance                                                                       | Emitter can put an inline object in `allOf`, which the selector diagnoses             | Named model accepted; no schema-format simulation                           | `openapi.ts` generic-base / `getSchemaOrRef` branches and validator selector                                  |
| Arbitrary inline object inserted through schema overrides       | Swagger/emitter representation, not an extra native type family                                                                                         | Can violate the `allOf` selector                                                      | No override inspection                                                      | Validator selector; native boundary                                                                           |
| Explicit body plus unannotated body parameters                  | Already rejected by HTTP `duplicate-body`                                                                                                               | No valid comparison population                                                        | No extra special case                                                       | Failed-project stdout for DeviceProvisioningServices, deployments, and ServiceLinker                          |

The test host imports only `@typespec/http`, not an emitter. Sixty native
tests cover violating/compliant shapes, cycles and shared siblings without
recursive descent, shared operations, and an imported diagnostic target.
The seven comparison fixtures contain three direct violations and four controls.
The controls' unrelated diagnostics are explicitly reviewed in `expect.json`.

| Regression shape                                                                   | Validity / support            | Selected Swagger field and validator outcome                                                 | Native outcome                                                   | Evidence                                                                |
| ---------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Complete spread of named `Fields` containing `@header`, `@statusCode`, and `value` | Valid supported HTTP TypeSpec | Response schema references `Fields` with only `value`; `etag` is a response header; accepted | Accepted through metadata-filtered source-property comparison    | `metadata-spread-response` fixture and header/status native regressions |
| Header inside named model, status outside its spread; reverse placement            | Valid supported HTTP TypeSpec | Response schemas reference the corresponding named models; accepted                          | Accepted through the same filter on payload and named candidates | `split-metadata-spread-response` fixture and native regressions         |

The native matrix covers no metadata, each metadata form inside-only or
outside-only, both forms inside, and both mixed inside/outside combinations.
Each row covers a complete spread, a direct named return, a compliant shared
imported alias, and an added payload property in that alias. The last case must
still report exactly once at the shared imported anonymous declaration, with
exact file/position assertions.

Independent local reviews exposed false positives from comparing a filtered
payload against an unfiltered named candidate. Checking the original response
separately did not solve mixed inside/outside metadata. The compiler's
`getEffectiveModelType` filter applies to both sides of that comparison; new
payload properties remain unsourced and therefore anonymous. No syntax-specific
exception or emitter dependency is needed.

`audit:noise` was also executed. Its current implementation omits the fourth
`enableLocalLinter` argument to `compile-worker.ts`, so it reports zero local
diagnostics for these fixtures. That supporting tool cannot establish local
coverage; the strict fixture snapshots and emitter-free tests do establish it.
The harness was not changed as part of this rule.

## Reports and comparable populations

- [External report snapshot](../../../docs/coverage_old.md): 450 compiled
  projects, 210 validator rules. It provides aggregate coverage credit, not
  diagnostic identities. It does not record a reproducible specs or generator
  revision or report timestamp; unmatched project identities cannot be recovered
  from its aggregates.
- [Retained observed report](../../../specs/coverage-breakdown.md), before this
  run: 462/468 compiled projects, 215 rules; TypeSpec generated
  `2026-08-10T09:38:18.108Z`.
- Specs source: `f6b53f105b95da05276530a0754a1c71b4f16397`.
  Retained Swagger generation: `2026-08-06T08:03:27.940Z`, using
  `test/harness/spec-dataset.ts`, resource-manager population, latest selected
  API version per project, production validator mode, readme suppressions not
  applied.
- TypeSpec runs all local rules over the source program, so raw output can
  include source declarations absent from selected Swagger or older versions.
  Failed TypeSpec projects must be excluded from both sides of the behavioral
  comparison and retained separately as failures.

| Report                     | Validator projects | Local TypeSpec projects | Official credit |             Overlap | Raw diagnostics           |
| -------------------------- | -----------------: | ----------------------: | --------------: | ------------------: | ------------------------- |
| External aggregate         |                  7 |                       0 |               0 | Not reconstructible | Not reported              |
| Retained observed baseline |                  7 |                       1 |               0 |                   0 | 10 validator / 1 TypeSpec |
| Final full run             |                  7 |                       1 |               0 |                   0 | 10 validator / 1 TypeSpec |

The external/observed difference cannot be assigned to a specific service from
the aggregate alone: the populations and generation metadata differ. Within the
retained observed report, the seven validator-only projects are ApiManagement,
DataFactory, DataMigration, DeveloperHub, HDInsight, Impact.Management, and
SecurityInsights. Its TypeSpec-only project is CustomLocations.

## Code-backed gap examples

### Response dictionary inlining

- **Classification:** validator-only
- **Status:** intentional native-contract difference
- **Project/API version:** DeveloperHub / `2025-03-01-preview`
- **Source:** `Microsoft.DevHub/DeveloperHub/routes.tsp`, `generatePreviewArtifacts`

```typespec
op generatePreviewArtifacts(
  ...ApiVersionParameter,
  ...SubscriptionIdParameter,
  ...LocationResourceParameter,
  @body parameters: ArtifactGenerationProperties,
): ArmResponse<Record<string>> | ErrorResponse;
```

```json
{ "type": "object", "additionalProperties": { "type": "string" } }
```

| Engine            | Observed result                                                                   |
| ----------------- | --------------------------------------------------------------------------------- |
| Swagger validator | Response schema violates because `additionalProperties` is present                |
| Native lint       | Named standard `Record` dictionary, not an implicit anonymous response expression |

ApiManagement uses `ArmResponse<Record<unknown>>` for `GatewayContracts.listTrace`;
HDInsight's `ClusterConfiguration` aliases `Record<string>`. The same schema
inlining cause applies. Adding emitter-specific dictionary naming rules would
not implement the chosen native anonymous-model guideline.

### Nested dictionaries and properties named additionalProperties

- **Classification:** validator-only
- **Status:** intentional native-contract difference
- **Project/API version:** DataFactory / `2018-06-01`
- **Source:** `models.tsp`, `ExecuteSSISPackageActivityTypeProperties`

```typespec
projectConnectionManagers?: Record<Record<SSISExecutionParameter>>;
packageConnectionManagers?: Record<Record<SSISExecutionParameter>>;
```

The selected inner dictionary schema is:

```json
{
  "additionalProperties": { "$ref": "#/definitions/SSISExecutionParameter" },
  "type": "object"
}
```

The validator diagnoses the inline inner dictionary; the native rule accepts the
standard generic dictionary type. HDInsight's
`configurations?: Record<ClusterConfiguration>` has the same nested shape.

The recursive selector also reaches ordinary properties literally named
`additionalProperties`. For example, SecurityInsights' `RecommendationProperties`
and `RecommendedSuggestion` contain:

```typespec
additionalProperties?: Record<string> | null;
```

```json
{
  "type": "object",
  "description": "Collection of additional properties for the recommendation.",
  "x-nullable": true,
  "additionalProperties": { "type": "string" }
}
```

This is a dictionary-valued property, not proof of an anonymous TypeSpec
declaration. DataMigration's `NodeMonitoringData` and Impact's
`WorkloadImpactProperties` similarly use `additionalProperties?: Record<unknown>`.
These findings are not evidence of a missed implicit response check.

### SDK override declaration versus emitted HTTP operation

- **Classification:** TypeSpec-only
- **Status:** intentional source/emission population difference
- **Project/API version:** CustomLocations / `2021-08-31-preview`
- **Source:** `client.tsp`, `resourceSyncRulesUpdate`

```typespec
@@override(ResourceSyncRules.update, resourceSyncRulesUpdate, "javascript");
```

The override's return union includes this unannotated model expression:

```typespec
{
  statusCode: 200;
  body: Microsoft.ExtendedLocation.resourceSyncRule;
  azureAsyncOperation: string;
  retryAfter: int32;
}
```

The properties are not marked `@statusCode`, `@body`, or `@header`. Native HTTP
semantics therefore see an implicit anonymous payload. The actual ARM update
operation in `ResourceSyncRule.tsp` uses `ArmCustomPatchAsync` with
`ArmResponse<resourceSyncRule>` and LRO headers, rather than this SDK override.
The service declares only `2021-08-31-preview`; this is not an older-version
finding. Ignoring the override would require SDK-scope semantics outside this
rule's compiler/HTTP boundary. No Swagger schema for that SDK-only declaration
is expected in the retained service comparison.

## Final corpus evidence

The existing `specs:typespec` runner completed all 468 projects at concurrency 6.
The final report records `2026-09-22T08:50:19.910Z` and duration `1155158 ms`.
The one-project `CustomLocations` preflight also succeeded. Both used the pinned
specs commit above; no project selector or timeout was relaxed.

Validation used the preserved development checkout at
`a213b2d6265b16ccd1a6dff22547b5d7fa84980e` plus this PR's changes. The later
target's unrelated PATCH-rule consolidation was inspected but not merged into
that checkout; this report does not claim to validate a merge commit.

The raw validator shard has 32 occurrences. Excluding failures on **both** sides
leaves ten. The complete affected-project population is:

| Project (relative to specs repository)                                                        | Selected API version | Validator | Native | Disposition                                                                       |
| --------------------------------------------------------------------------------------------- | -------------------- | --------: | -----: | --------------------------------------------------------------------------------- |
| `specification/apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement`          | `2025-09-01-preview` |         1 |      0 | Response `Record<unknown>`                                                        |
| `specification/datafactory/resource-manager/Microsoft.DataFactory/DataFactory`                | `2018-06-01`         |         2 |      0 | Two nested dictionaries                                                           |
| `specification/datamigration/resource-manager/Microsoft.DataMigration/DataMigration`          | `2025-09-01-preview` |         1 |      0 | Property named `additionalProperties`, containing `Record<unknown>`               |
| `specification/developerhub/resource-manager/Microsoft.DevHub/DeveloperHub`                   | `2025-03-01-preview` |         1 |      0 | Response `Record<string>`                                                         |
| `specification/extendedlocation/resource-manager/Microsoft.ExtendedLocation/CustomLocations`  | `2021-08-31-preview` |         0 |      1 | SDK override source declaration                                                   |
| `specification/hdinsight/resource-manager/Microsoft.HDInsight/HDInsight`                      | `2025-01-15-preview` |         2 |      0 | One response dictionary and one nested dictionary                                 |
| `specification/impact/Impact.Management`                                                      | `2026-01-01-preview` |         1 |      0 | Property named `additionalProperties`, containing `Record<unknown>`               |
| `specification/securityinsights/resource-manager/Microsoft.SecurityInsights/SecurityInsights` | `2025-10-01-preview` |         2 |      0 | Two properties named `additionalProperties`, containing nullable `Record<string>` |

Thus the seven rows with a positive validator count are the complete
validator-only list; CustomLocations is the complete TypeSpec-only list.
The overlap list is empty. No unmatched project was inferred from aggregate
subtraction.

### Cardinality and selected-version attribution

| Identity / statistic                                           | Result |
| -------------------------------------------------------------- | -----: |
| Aligned validator raw occurrences                              |     10 |
| Validator project + Swagger file + JSON path                   |     10 |
| Validator project + JSON path (file-independent)               |     10 |
| Aligned native raw diagnostics                                 |      1 |
| Native project + source file + line + column                   |      1 |
| Equal-count successful projects, including unaffected projects |    454 |
| Equal-count affected projects                                  |      0 |
| Validator-higher projects / total positive difference          | 7 / 10 |
| Native-higher projects / total positive difference             |  1 / 1 |

The sole native diagnostic is `CustomLocations/client.tsp:154:5`.
`main.tsp` declares exactly one version, `2021-08-31-preview`, and the override
has no added/removed-version decoration. Therefore the selected-version native
population is also **one**; **zero** diagnostics are excluded as older-version
findings. Its difference is SDK emission scope, not version scope. There is no
source-to-emitted-occurrence duplication to normalize in the assessed population,
and no collision-prone property-name matching was used.

### Compile failures and limits

The failed-project set exactly matches the archived pre-run TypeSpec index:

| Project (relative to specs repository)                                                                   | Compiler/HTTP error                                                           | Excluded validator occurrences |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -----------------------------: |
| `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices` | `@typespec/http/duplicate-body` in `client.tsp`                               |                              0 |
| `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`                  | `@typespec/http/missing-uri-param` while instantiating legacy operation       |                              0 |
| `specification/network/resource-manager/Microsoft.Network/Network/Network`                               | `@typespec/http/missing-uri-param` for `applicationGatewayAvailableSslOption` |                             21 |
| `specification/quota/resource-manager/Microsoft.Quota/Quota`                                             | `@typespec/http/missing-uri-param` for subscription/resource-group parameters |                              0 |
| `specification/resources/resource-manager/Microsoft.Resources/deployments`                               | `@typespec/http/duplicate-body` in a legacy operation                         |                              1 |
| `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`                     | `@typespec/http/duplicate-body` in `client.tsp`                               |                              0 |

These are compile failures, not native-test timeouts. No failed project was
silently counted as compliant. Their raw stdout/stderr, final shards, exact
baseline, and cleanup journal are retained as external validation artifacts;
generated corpus files are not PR deliverables.

An exploratory lookup also found a retained Network diagnostic whose recorded
JSON path was absent from its attributed Swagger file. That project is excluded
because compilation fails; no claimed schema correspondence or equivalence is
based on that unresolved retained-data inconsistency.

Reproduction from the prepared isolated specs checkout:

```powershell
pnpm --dir packages/typespec-lintdiff build
pnpm --dir packages/typespec-lintdiff exec vitest run test/rules/avoid-anonymous-types.test.ts
pnpm --dir packages/typespec-lintdiff validate --rule AvoidAnonymousTypes
pnpm --dir packages/typespec-lintdiff specs:typespec --specs-repo <isolated-specs-worktree> --concurrency 6
```

The fixture harness requires its documented validator/common-types sources.
The native test command does not require an emitter. Formatting and linting are
restricted to explicitly changed maintained files; harness snapshots are not
reformatted.

## Required changes and conclusion

Production changes are confined to `avoid-anonymous-types.ts`, with directly
related native tests, fixtures, snapshots, and this evidence. No validator,
emitter, report generator, corpus dataset, or unrelated rule is modified.

The native supplemental contract has passing focused regression coverage and a
completed full-corpus observational check. Independent implementation review
completed before the corpus run with no significant issues.
Exact functional equality with the
entire Swagger rule is **not claimed**: its schema-inlining and extension decisions
are intentionally outside native scope. No unexplained discrepancy remains
within the assessed population. The six compile failures and the older
aggregate's missing provenance remain explicit evidence limitations, not proof
of universal equivalence.
