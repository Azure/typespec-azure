# ConsistentResponseSchemaForPut migration evidence

## Result and gap summary

- **Results:** In the 2026-09-09 staging/latest-version comparison, Swagger reports
  **13 diagnostics across 8 projects**; TypeSpec reports **1 in 1 project**.
  The assessed population is 462 of 468 projects; six compile failures are excluded.
- **Why 13 versus 1:** Both catch the same genuine Reservations/Quota mismatch.
  The other **12 findings across 7 projects** have identical `200`/`201` schema
  references. The validator compares JavaScript object identity (`!==`), so
  separate objects representing the same schema trigger false positives.
  TypeSpec compares schema types instead and intentionally avoids these findings.
  See the [reference-pair evidence](#gap-example-resolved-external-reference-identity).
- **Decision:** The source now skips conflicting body types within one status,
  avoiding order-dependent secondary warnings on inputs AutoRest already rejects.
  Valid-response behavior and corpus counts are unchanged; the count gap does not
  require reproducing validator defects.
- **Limits:** External-reference resolution was not independently verified, and
  the source's nested-namespace limitation remains. See the
  [evidence limitations](#earlier-template-and-array-repair-findings) and
  [qualified conclusion](#official-coverage-and-conclusion).

## Sources and scope

- azure-rest-api-specs commit:
  `f6b53f105b95da05276530a0754a1c71b4f16397`
- Original recorded azure-openapi-validator source commit:
  `1198225afecbb818c3050d4d2a91da92e14e56ce`
- Fixture metadata checkout for this run:
  `6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f`; the target comparator still uses
  exact status lookup and JavaScript object identity.
- Validator registration: ARM, `RPC-Put-V1-29`, `stagingOnly: true`,
  `resolved: true`, OpenAPI 2, selector `$.paths.*`.
- Focused repair harness runtime: installed
  `@microsoft.azure/openapi-validator-rulesets@2.2.6`; its function retains the
  same exact-status and object-identity logic as the pinned upstream source above.
- Repaired TypeSpec corpus run: full, 468 projects, index `generatedAt`
  `2026-09-09T05:17:51.600Z`, recorded duration 1,693,363 ms
  (28 minutes 13 seconds), with 462 successful projects and six compile failures.
  The process completed with exit code zero at `2026-09-09T05:20:31.6454966Z`;
  the index timestamp precedes final output writing.
- Repaired source rule Git blob: `78a6d1857da53097cbbe6e657b951de4ca27f9d8`.
  The run used uncommitted repair changes on source HEAD
  `bc936175f30133b02b1cf6a714afc491701a7365`, with core at
  `a6137cac43a727ce0c2656364fd72d50c272ee4a`. The fetched migration target was
  `fbc43e9abaeeeb200a7fbe349a833deb8a8f52ef`.
  The corpus metadata recorded local-linter fingerprint
  `sha256:9cae0ee6b15b6f896edc50f62447609d8fbf49b49d07e8ae66d6dca4b6c82b84`.
- One-rule staging scan: `2026-09-09T04:51:52.035Z`, same pinned Swagger dataset
  and installed validator runtime as the focused repair.

The checked-in production comparison cannot measure this rule: production mode
shows zero validator projects because the rule is staging-only. The older
external report lists 8 validator projects and 1 TypeSpec project but does not
retain reconstructable project sets. A dedicated one-rule staging scan was
therefore used to establish the validator population.

### Report reconciliation

The external [coverage report](../../../docs/coverage_old.md) records 450 compiled
projects; its local snapshot was committed as
`6a418911dbe5d35992fb5845cf4460d45643fec8`. It does not preserve an exact
specs/generator revision, execution mode, diagnostic identities, or one-sided
project sets. Its aggregate totals cannot identify missing services.
The regenerated [observed report](../../../specs/coverage-breakdown.md) measures
same-project overlap over 462 successful projects from the pinned 468-project
dataset. Generated reports are validation artifacts and are not committed in this
repair; the table below records the freshly observed rule row.

| Report snapshot                              | Mode         | Validator projects | TypeSpec projects | Official credit | Overlap             | Validator-only      | TypeSpec-only       | Raw diagnostics (Swagger / TypeSpec) |
| -------------------------------------------- | ------------ | -----------------: | ----------------: | --------------- | ------------------- | ------------------- | ------------------- | ------------------------------------ |
| External `coverage_old.md`                   | Not retained |                  8 |                 1 | 0               | Not reconstructable | Not reconstructable | Not reconstructable | Not retained                         |
| Previously checked-in observed report        | Production   |                  0 |                 1 | No              | 0                   | 0                   | 1                   | 0 / 1                                |
| Repaired full run plus one-rule staging scan | Staging      |                  8 |                 1 | No              | 1                   | 7                   | 0                   | 13 / 1                               |

The zero-to-eight validator-project difference is the staging-only execution
policy, not newly detected rule behavior. The reports also differ in population
and coverage definitions: official-rule credit in the external report is not
observed local-lint overlap. No unsupported project correspondence is inferred
from the external aggregate row.

## Focused behavior (revalidated 2026-09-09)

Twelve focused fixtures cover the exact verb/status gates, absent statuses and
bodies, named and inline schema families, external references, binary and
multipart responses, and multiple content variants. Three violation fixtures are
covered by the local lint. Six validator-clean compliance fixtures remain clean.
Three compliance fixtures explicitly record reviewed Swagger false positives:

- 1 identical external-reference diagnostic;
- 6 identical inline-schema diagnostics;
- 5 identical binary/multipart/tuple/string/array-schema diagnostics.

These false positives come from comparing resolved JavaScript objects with
`!==`, not from a difference in emitted schema values.

### Mixed-body response repair

Promotion review [comment 3956634943](https://github.com/Azure/typespec-azure/pull/5423#discussion_r3956634943)
identified order-dependent last-body selection in `getResponseBody`. Source
inspection showed that AutoRest's `emitResponseObject` performs the same selection,
but also reports `@azure-tools/typespec-autorest/duplicate-body-types` whenever
body type identities differ within one status. Thus the finding did not establish
a missed check on successfully emitted Swagger. The user explicitly selected a
conservative source repair: omit this secondary lint comparison on emitter-invalid
mixed-body responses rather than retain the arbitrary last-body warning.

`getResponseBody` now returns no comparable body when two body-bearing variants
have different `Type` identities. Either exact status can trigger this exemption.
The emitter error remains; no schema is synthesized, bodies are not structurally
merged, and valid response groups still aggregate all content types. A bodyless
variant is not a conflicting body type. This change applies to the source rule;
the promotion copy must be synchronized separately, not silently changed here.

Twenty-six native tests pass. The three new failing cases before the guard were
conflicts at `200`, conflicts at `201`, and distinct anonymous body types with equal
properties. Regression tests cover both variant orders, and separately invoke
AutoRest to assert its `duplicate-body-types` error at each exact status. Controls
preserve matching named bodies, genuine `200`/`201` differences, mixed JSON/binary
classification, and bodyless variants.

The new `different-multiple-content-types` fixture has four genuine violations in
both engines: two reversed named-body variant orders and two reversed JSON/binary
orders at `201`. All twelve fixture comparisons and 36 snapshots pass. Existing
fixtures and their snapshots are unchanged. Invalid mixed-body inputs are covered
by native/emitter diagnostic tests, not misrepresented as successful Swagger
fixture compilations.

The intrinsic-indexer review suggestion was not adopted: the compiler's standard
`Array` declares `@indexer`, and no missing intrinsic identity was demonstrated.
The promotion's fully qualified suppression-code documentation correction is
outside this source repair.

### Gap example: secondary warning on invalid response variants

- **Classification:** TypeSpec-only secondary diagnostic on emitter-invalid input
- **Status:** fixed
- **Project/API version:** native regression, not a real-service count gap
- **Source:** `response content variants` in
  `test/rules/consistent-response-schema-for-put.test.ts`

**TypeSpec source**

```typespec
model Json is Response<200, string, "application/json">;
model Xml is Response<200, int32, "application/xml">;
model Other is Response<201, string, "application/json">;
@put op put(): Json | Xml | Other;
```

`Response` supplies `@statusCode`, `@header contentType`, and `@body` through the
test's generic response wrapper.

**Emitter boundary:** AutoRest rejects the conflicting `200` bodies with
`duplicate-body-types`; there is no successful Swagger emission to compare.

| Engine                    | Observed result                                                     |
| ------------------------- | ------------------------------------------------------------------- |
| AutoRest                  | `duplicate-body-types` error in both variant orders; unchanged      |
| Source lint before repair | Secondary mismatch warning when the last `200` body is `int32`      |
| Source lint after repair  | No secondary comparison for the conflicting status, in either order |

**Disposition:** Defer schema comparison until each status has one body type.
This avoids noisy diagnostics on invalid input, not a validator count mismatch.

### Earlier template and array repair findings

The previous conclusion overstated the evidence: the stored
`same-special-response-bodies/tsp-diagnostics.json` contained a local lint warning
for `tupleAndUnknownArray`, despite the emission matrix claiming it was clean.
Both responses emit `{ "type": "array", "items": {} }`. Ordinary `unknown[]`
carries the compiler's intrinsic `indexerDecorator`, so a zero-decorators test
incorrectly prevented normalization.

The repair permits only that intrinsic decorator, identified by function identity
from the standard `Array` declaration through `checker.getStdType("Array")`.
It does not whitelist arbitrary decorators by JavaScript function name. Named
arrays, friendly-named arrays, constraints, custom decorators (including one
also named `indexerDecorator`), and typed array elements remain distinct.

The semantic walker also follows `sourceOperation`, exposing instantiated
operation and interface templates in addition to their concrete aliases.
`isTemplateDeclarationOrInstance` now filters the template operation or its
template interface, while preserving concrete namespace operations, interface
members, and inherited operations on concrete interfaces. A same/different pair
of aliases now produces exactly one diagnostic on the differing alias; two
violating aliases still produce two diagnostics.

Fifteen focused native regression tests pass. Seven failed against the original
implementation: four template-source duplication cases and three tuple/unknown
array normalization cases. The eleven-fixture harness also passes: two covered
violation fixtures, six validator-clean fixtures with reviewed ambient warnings,
and three reviewed validator discrepancies. All 33 selected snapshots were
regenerated; only the erroneous local tuple/unknown-array warning changed.
The fixture snapshots retain the focused results. The repaired implementation
was then run over the full corpus; the results below supersede the
earlier historical counts. An independent source-diff review found no significant
issues in the repairs.

External-reference limitation: the focused Spectral harness uses a fixed
`test/openapi.json` document URI and filters `invalid-ref` diagnostics.
Common-type sources were not provisioned for these focused runs, so their success
does not prove successful external-reference resolution. The staging helper also
does not retain resolver diagnostics. The identical-reference conclusion below
rests on inspected emitted reference pairs and the validator's identity-comparison
implementation, not a claim of independently verified resolution in these runs.
The repaired template and tuple/array regressions do not use external references.

The earlier repair was limited to template duplication and intrinsic-array normalization.
The source's existing provider-namespace guard remains unchanged. Its
`resolveProviderNamespace` call searches the supplied namespace and descendants,
not ancestors, so nested operation namespaces remain a known source limitation.
The approved ARM promotion removes this lintdiff-only guard as a destination
adaptation and covers ordinary and nested namespaces without provider metadata.

Validation commands from the repository root (set `LINTDIFF_VALIDATOR_ROOT` to an
upstream checkout at the validator commit above):

```powershell
mise exec -- pnpm --filter tsp-lintdiff-local-linter test test\rules\consistent-response-schema-for-put.test.ts
mise exec -- pnpm --filter tsp-lintdiff-local-linter build
mise exec -- pnpm --filter tsp-lintdiff-local-linter validate ConsistentResponseSchemaForPut --update-snapshots --parallelism=2
mise exec -- pnpm --filter tsp-lintdiff-local-linter validate ConsistentResponseSchemaForPut --parallelism=2
mise exec -- pnpm --filter tsp-lintdiff-local-linter exec oxlint src\rules\consistent-response-schema-for-put.ts test\rules\consistent-response-schema-for-put.test.ts --deny-warnings
mise exec -- pnpm --dir packages\typespec-lintdiff specs:staging specs ConsistentResponseSchemaForPut
mise exec -- pnpm --dir packages\typespec-lintdiff specs:typespec --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-consistent-response-schema-for-put --filter specification/reservations/resource-manager/Microsoft.Capacity/Reservations/Quota --concurrency 6
mise exec -- pnpm --dir packages\typespec-lintdiff specs:typespec --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-consistent-response-schema-for-put --concurrency 6
```

Package build and focused lint pass. Package-wide `pnpm --filter
tsp-lintdiff-local-linter lint` remains blocked by 232 existing warnings in
unmodified files; none comes from the repaired rule or its tests.

For the 2026-09-09 repair, validation used the explicit source/test paths above,
not package-wide lint. Temporary `test/common-types` and
`test/azure-openapi-validator` junctions supplied the focused fixture inputs and
were removed afterward. Their presence does not establish successful external
reference resolution: the existing harness still filters `invalid-ref`.
`audit:noise` has no rule selector and would recompile unrelated rules; the
focused harness's exact ambient-diagnostic and target-diagnostic assertions
provide the scoped noise evidence instead.

## Repaired full-corpus comparison

The staging Swagger scan found 13 diagnostics across 8 projects:

- `specification/durabletask/resource-manager/Microsoft.DurableTask/DurableTask`
- `specification/maps/resource-manager/Microsoft.Maps/Maps`
- `specification/mysql/resource-manager/Microsoft.DBforMySQL/FlexibleServers`
- `specification/postgresqlhsc/resource-manager/Microsoft.DBforPostgreSQL/PostgresqlHsc`
- `specification/redis/resource-manager/Microsoft.Cache/Redis`
- `specification/reservations/resource-manager/Microsoft.Capacity/Reservations/Quota`
- `specification/security/resource-manager/Microsoft.Security/Security/PrivateLinksAPI`
- `specification/sql/resource-manager/Microsoft.Sql/SQL`

The repaired full TypeSpec run produced 1 diagnostic in 1 project:

- `specification/reservations/resource-manager/Microsoft.Capacity/Reservations/Quota`

Selected-version behavioral comparison:

| Population           | Projects | Diagnostics |
| -------------------- | -------: | ----------: |
| Swagger staging      |        8 |          13 |
| TypeSpec full corpus |        1 |           1 |
| Same-project overlap |        1 |           1 |
| Validator-only       |        7 |          12 |
| TypeSpec-only        |        0 |           0 |

No TypeSpec-only diagnostics required older-version exclusion. Swagger is the
dataset-selected latest version; TypeSpec uses the source program with all
declared versions for this rule. Its sole finding is present in Quota's selected
`2020-10-25` API, so the raw and selected-version TypeSpec populations both contain
that one finding. No filename heuristic or extra production-rule filter was used.

Diagnostic identity checks preserve the raw cardinalities: Swagger has 13 unique
`project + swaggerFile + JSON path` identities and 13 unique `project + JSON path`
identities. TypeSpec has one unique `project + sourceFile + line + column` identity.
Across the eight affected projects, one has equal counts, seven have higher
Swagger counts, and none has higher TypeSpec counts. The sum of positive
Swagger-minus-TypeSpec differences is 12; the sum in the opposite direction is
zero. These are different identity domains, not a claim of one-to-one mappings.

### Genuine overlap

Quota's create/update response returns `CurrentQuotaLimitBase` for `200` and
`QuotaRequestSubmitResponse201` for `201`. The local rule reports the operation
at `CurrentQuotaLimitBase.tsp:71`, matching the intended Swagger violation.

### Validator-only projects

DurableTask, Maps, MySQL FlexibleServers, PostgreSQL HSC, Redis, Security
PrivateLinks, and SQL account for all 12 validator-only diagnostics. In every
case the emitted `200` and `201` `$ref` strings are identical. The resolved
validator materializes separate object instances and reports them as unequal.
DurableTask is representative: both responses use the same private-endpoint
resource type, but the staging validator still reports the identical external
reference. Reproducing this object-identity artifact would reject consistent
TypeSpec APIs, so it is intentionally excluded.

### Gap example: resolved external-reference identity

- **Classification:** validator-only
- **Status:** intentional
- **Project/API version:** DurableTask / `2026-05-01-preview`
- **Source:** `scheduler.tsp:15-16,183`,
  `Schedulers_CreateOrUpdatePrivateEndpointConnection`

**TypeSpec source**

```typespec
model PrivateEndpointConnection is PrivateEndpointConnectionResource;
alias PrivateEndpointOperations = PrivateEndpoints<PrivateEndpointConnection>;
// Member of the scheduler operations interface:
createOrUpdatePrivateEndpointConnection is PrivateEndpointOperations.CreateOrUpdateAsync<Scheduler>;
```

**Emitted OpenAPI**

The selected operation's two response schemas are:

```json
{
  "200": {
    "schema": {
      "$ref": "../../../../../../../../../common-types/resource-management/v6/privatelinks.json#/definitions/PrivateEndpointConnection"
    }
  },
  "201": {
    "schema": {
      "$ref": "../../../../../../../../../common-types/resource-management/v6/privatelinks.json#/definitions/PrivateEndpointConnection"
    }
  }
}
```

| Engine            | Observed result                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Swagger validator | One diagnostic at `paths[...].put.responses.200.schema`: separately resolved JavaScript objects are unequal by identity. |
| TypeSpec lint     | No diagnostic: both responses use the same schema type.                                                                  |

**Explanation:** Maps, MySQL, PostgreSQL HSC, Redis, and Security also use identical
external common-type references for both statuses. SQL contributes the largest
outlier, six diagnostics: its pairs identically reference `./common.json`
definitions for `DatabaseVulnerabilityAssessment`, `JobExecution`,
`SensitivityLabel`, or `SqlVulnerabilityAssessment`. All 12 pairs were inspected;
their emitted references are equal.

**Disposition:** Do not reproduce the validator's resolved-object identity defect.

### Gap example: intrinsic array normalization

- **Classification:** fixture diagnostic-count difference
- **Status:** fixed
- **Project/API version:** local focused fixture, not a real-service corpus finding
- **Source:** `same-special-response-bodies/main.tsp:71-78`,
  `tupleAndUnknownArray`

**TypeSpec source**

```typespec
model UnknownArrayCreated {
  @statusCode statusCode: 201;
  @body body: unknown[];
}
@route("/tuple-unknown-array")
@put
op tupleAndUnknownArray(@query("api-version") apiVersion: string): TupleOk | UnknownArrayCreated;
```

**Emitted OpenAPI**

Both `TupleOk` and `UnknownArrayCreated` emit:

```json
{ "type": "array", "items": {} }
```

| Engine                      | Observed result                                                                  |
| --------------------------- | -------------------------------------------------------------------------------- |
| Swagger validator           | Reports equal inline objects because it compares JavaScript identity.            |
| TypeSpec lint before repair | One false warning: the intrinsic array decorator prevented schema normalization. |
| TypeSpec lint after repair  | No warning; genuine intrinsic indexer identity is allowed.                       |

**Disposition:** Keep named, constrained, custom-decorated, and typed arrays
distinct; only remove the false warning for equivalent unconstrained arrays.

### Gap example: instantiated source-operation duplication

- **Classification:** TypeSpec diagnostic-count difference
- **Status:** fixed
- **Project/API version:** focused native regression, not a real-service corpus finding
- **Source:** `test/rules/consistent-response-schema-for-put.test.ts`,
  `reports only the differing concrete alias, not its instantiated source`

**TypeSpec source**

```typespec
@put op Template<T>(): OkBody<string> | CreatedBody<T>;
@route("/same") op same is Template<string>;
@route("/different") op different is Template<int32>;
```

**Validator boundary:** The validator visits emitted PUT path items, not the
template-source nodes visited by the TypeSpec semantic walker.

| Engine                      | Observed result                                                  |
| --------------------------- | ---------------------------------------------------------------- |
| TypeSpec lint before repair | Reports both `different` and its instantiated `Template` source. |
| TypeSpec lint after repair  | Reports only the concrete `different` operation.                 |

**Disposition:** Filter template declarations and instances, including template
interfaces, without suppressing concrete aliases or inherited concrete-interface
operations. This example establishes target/count behavior through native
diagnostic assertions, not an additional Swagger snapshot.

## Failed projects

Six projects failed the TypeSpec lint process and were excluded from the
assessed population:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

None is one of the eight staging Swagger projects; the similarly named genuine
overlap is the separate Reservations/Quota project.
DeviceProvisioningServices, deployments, and ServiceLinker fail with
`@typespec/http/duplicate-body`; TenantActionGroups, Network, and Quota fail with
`@typespec/http/missing-uri-param`. These are the same six failed projects as the
prior run, are outside this repair, and are excluded from both sides of the
assessable comparison. Their diagnostics do not establish rule equivalence.

## Official coverage and conclusion

`@azure-tools/typespec-azure-core/response-schema-problem` is not equivalent.
It compares all non-error response bodies for every HTTP verb and success-status
combination, producing out-of-scope findings such as POST `200`/`201` and PUT
`200`/`202`.

The worker coverage classification is **partial**, verified against the fetched
remote migration target. Core's rule is registered and enabled, but compares all
non-error bodies by effective type identity rather than this exact emitted-schema
contract. ARM's registered `arm-resource-operation-response` implements RPC008 for
tracked-resource lifecycle operations, not arbitrary PUT bodies. The RPC coverage
inventory's template/lifecycle entries therefore do not eliminate this custom
operation surface. The existing local rule remains the repair owner; no new
overlapping rule was added.

Within the applicable namespaces covered by these fixtures, the dedicated rule
implements the intended
`ConsistentResponseSchemaForPut` contract: ARM PUT only, exact `200` and `201`
responses only, both schemas required, and consistent emitted schema identity.
It deliberately excludes the validator's resolved-object identity defects while
preserving genuine named-schema and inline-schema differences. The emission
matrix in `rule.md` and the rerun focused fixtures support the tested contract,
including the repaired template, intrinsic-array, and mixed-body cases. This is not a proof of
equivalence for all possible decorated or emitter-specific shapes. The new full
run confirms unchanged real-service behavior and no unexplained one-sided
projects; the documented nested-namespace source limitation remains. The source
repairs address false-positive, duplicate, and invalid-input secondary diagnostic
behavior, not raw Swagger/TypeSpec count equality. The mixed-body exemption is an
intentional boundary for unsuccessful emission, not an assertion that conflicting
schemas are equal.
