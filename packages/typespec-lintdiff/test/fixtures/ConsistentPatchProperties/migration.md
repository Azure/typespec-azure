# ConsistentPatchProperties migration evidence

## Result and gap summary

The final September 11 full production run has **151 Swagger diagnostics in 27
projects versus 325 TypeSpec diagnostics in 32 projects**, over 462 successfully
compiled projects; six failures are excluded from both sides. All 27 validator
projects overlap. Individual TypeSpec findings, including multiplicity, are
unchanged from the earlier inheritance-repair run and September 9.

The five TypeSpec-only projects contribute 19 removed/renamed-declaration
findings and 22 Informatica findings on selected-version schema mismatches.
The other 133 extra raw findings occur in overlapping projects, where reporting
granularity and repeated source targets differ.

**Decision: both inheritance repairs completed; Swagger equivalence remains
partial.** Native regressions correct shadowed `never` properties and inherited
authored shapes hidden by synthetic discriminators. Four inheritance fixtures
show opposite Swagger/native outcomes from emitted `allOf` and discriminator
precedence. Four scope cases also differ intentionally.
Unchanged corpus findings do not establish universal equivalence.

**Limits:** Informatica's validator-side omission mechanism remains unisolated.
Version exclusions establish the four one-sided-project exclusions, not a
globally latest-version-projected diagnostic total.

## Required changes and native contract

### Inherited authored-discriminator repair

Promotion of the first inheritance repair exposed another inherited-shape
problem: synthetic discriminator metadata was inserted before the base model's
authored properties were visited. An effective base property encoded as `kind`
was skipped, losing its nested type. This missed PATCH mismatches and produced
false positives when the inherited object appeared in the resource response.

The helper now collects effective authored properties across the full model
chain before filling in missing discriminator metadata. An inherited source
property named `kind`, even when encoded differently, prevents creation of a
second synthetic `kind`. The earlier source-name/`never` shadowing repair is
preserved; synthetic metadata does not resurrect a shadowed authored type.

Seven additional native cases cover inherited and inline request/response
shapes, an encoded inherited discriminator source name, a genuine synthetic
discriminator, and a `never` override combined with discriminator metadata.
The inherited request, inherited response, and encoded-source-name cases
exposed the old behavior. One attempted control derived from a discriminated
base without a discriminator value was rejected by compiler
`missing-discriminator-property`; it was replaced with a valid model carrying
its own discriminator metadata. No suppression or special-case support was
added for that invalid shape.

The two new fixtures are valid HTTP/ARM authoring with the same object-valued
encoded property already covered by `encoded-discriminator-property`; the
new dimension is inheritance. In their emitted Swagger, `Base.properties.kind`
is an object with `extra`, while `Details.properties.kind` is a synthetic string
and `Details.allOf` references `Base`. The validator's `getProperties` merges
the derived property over the base. Therefore it accepts the inherited PATCH
fixture and reports `details.kind.extra` in the inherited response fixture.
The native outcomes are the opposite: the effective authored object is used
in both request and response comparison. These are recorded contract
differences, not validator defects or reasons to reproduce emitter ordering.

### Inherited override repair

The September 11 promotion review found that skipping a derived `never`
property allowed a later base-model walk to revive it. This caused false
positives on PATCH bodies and missed violations on response models. The rule
now uses compiler `getProperty(model, property.name)` to identify the effective
declaration before resolving JSON names and filtering `never`. This also fixes
the directly related case where an override changes its encoded name.

Seven native regressions cover request/response shadowing at top-level and
nested positions, intermediate inheritance, encoded-name overrides, a
non-`never` redeclaration, and an unrelated property sharing an encoded name.
Six failed before the repair; the unrelated-name control already passed.
All snippets compile without suppressions or emitter execution.

Two comparison fixtures show why native correctness does not imply Swagger
parity. In `never-patch-override`, `Update extends Base` removes `extra` with
`never`; the native lint correctly accepts it. Its emitted `Update.allOf`
still references `Base`, whose `properties.extra` produces one validator
diagnostic at `paths./widgets.patch.parameters.0.schema`.
In `never-resource-override`, the response similarly removes `extra` natively,
so PATCH `extra` is invalid. Emitted `Resource.allOf` still exposes the base
property and the validator accepts it. AutoRest's `getSchemaForModel` skips
`never` properties but preserves the base reference; the validator's
`getProperties` merges the referenced `allOf` properties. The validator is
checking the emitted schema correctly in both cases; it cannot observe the
TypeSpec override. Snapshots preserve that evidence without changing the
native contract to reproduce emission.

This is an explicitly authorized source repair following merged PR #5439,
not another initial migration. The unfinished official-library promotion
remains separate and unchanged until this source repair is ready.

### Prior native-boundary repair

The repair replaces `TCGCContext` with compiler `Program`, removes
`createTCGCContext` and all `isInScope` calls, and preserves the native PATCH
body/response comparison. No emitter, generator context, private decorator
state, or generated OpenAPI is used to decide diagnostics. Compiler APIs still
provide JSON encoded names, inheritance, nullability, and discriminator metadata.

PATCH `200`, then `201`, then same-path GET `200`/`201` selects the comparison
body. Exact response codes take precedence over a containing range. The lint
recursively compares same-level properties and reports authored targets; this
repair does not change diagnostic granularity, cycle handling, or API-version
policy.

Directly related changes are the native regression tests, four scope-comparison
fixtures and snapshots (two existing, two new), and partial-coverage metadata.
The ARM provider check remains lintdiff-only isolation in a mixed runner; its
official-library adaptation is separate from this repair.

The existing official `arm-resource-patch` rule remains only partial coverage:
it checks registered resource PATCH bodies without this recursive same-level
comparison or the complete custom-operation response/fallback selection.
The merged source PR #5399 is historical; this is an explicitly approved
follow-up repair, not a duplicate migration.

## Evidence revisions and populations

Upstream research uses `azure-openapi-validator` commit
`6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f`:
[implementation](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/packages/rulesets/src/spectral/functions/consistent-patch-properties.ts),
[`diffSchema` and GET lookup](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/packages/rulesets/src/spectral/functions/utils.ts),
[tests](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/packages/rulesets/src/spectral/test/consistent-patch-properties.test.ts),
and [documentation](https://github.com/Azure/azure-openapi-validator/blob/6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f/docs/consistent-patch-properties.md).
The installed comparison engine is `@microsoft.azure/openapi-validator-rulesets`
2.2.6. Its resolved ARM selector is `$.paths.*.patch`, using the first body
parameter schema and the response precedence described above. Upstream tests
cover inherited missing properties, a matching subset, and asynchronous GET
fallback. The scope limitations occur before this validator, during emission.

| Evidence                                                               | Revision and population                                                                                                                                   | `ConsistentPatchProperties` row                                                                                                                                                                |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [External coverage snapshot](../../../docs/coverage_old.md)            | The checked-in snapshot links to its source gist but records no date, spec commit, or generator revision. It reports 450 compiled projects and 210 rules. | `lint`; 303 validator projects; 25 local-lint projects; 0 official projects; 8.3%. Project identities cannot be reconstructed from this aggregate row.                                         |
| [Checked-in observed report](../../../specs/coverage-breakdown.md)     | Specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`; 462/468 successfully compiled projects.                                                          | Before this change: `production`; 27 validator projects; 27 TypeSpec projects; 23 overlap; 4 validator-only; 4 TypeSpec-only; 151 validator and 122 TypeSpec diagnostics.                      |
| September 4 source evidence (historical)                               | Full review-fix run from the same specs commit; 462/468 projects compiled; duration 1,261,930 ms.                                                         | 27 validator projects; 32 TypeSpec projects; 27 overlap; 0 validator-only; 5 TypeSpec-only; 151 validator and 325 TypeSpec diagnostics.                                                        |
| September 9 native-boundary evidence (historical)                      | Full run generated 2026-09-09T09:24:28.545Z; completed 2026-09-09T17:28:59+08:00; same specs commit; 462/468 compiled; duration 4,678,050 ms.             | 27 validator projects; 32 raw TypeSpec projects; 27 overlap; 0 validator-only; 5 raw TypeSpec-only; 151 validator and 325 raw TypeSpec diagnostics.                                            |
| September 11 inherited-override evidence (historical)                  | Full run generated 2026-09-11T04:09:06.638Z; completed 2026-09-11T12:11:44+08:00; same specs commit; 462/468 compiled; duration 1,287,834 ms.             | 27 validator projects; 32 raw TypeSpec projects; 27 overlap; 0 validator-only; 5 raw TypeSpec-only; 151 validator and 325 raw TypeSpec diagnostics.                                            |
| [Final retained discriminator-repair evidence](./corpus-evidence.json) | Full run generated 2026-09-11T05:20:19.336Z; completed 2026-09-11T13:23:02+08:00; same specs commit; 462/468 compiled; duration 1,289,034 ms.             | `production`; `partial` semantic coverage; 27 validator projects; 32 raw TypeSpec projects; 27 overlap; 0 validator-only; 5 raw TypeSpec-only; 151 validator and 325 raw TypeSpec diagnostics. |

The external report uses an unidentified older population and aggregate
migration credit. The observed reports require same-project diagnostics on the
pinned successful-project population. The final TypeSpec diagnostic count also
includes every declared API version; the validator dataset retains one selected
version per project.

The final discriminator repair ran on `feature/lintdiff-consistent-patch-properties-native`
at commit `ca14b58cdf4dfc8b1fe835c16bf3bbb30f6bdb93`, with the uncommitted
discriminator repair included. The runner's source fingerprint is retained in
`corpus-evidence.json`. The scope is ARM, production validator execution,
successfully compiled projects only, no readme suppressions on retained
Swagger, and normal source-program TypeSpec diagnostics (including source
suppressions). No new global API-version projection or normalization was added.
The checked-in coverage report is deliberately historical: refreshed canonical
corpus artifacts are not included in this rule-repair PR.

An independent comparison of the complete diagnostic multiset
(`project`, source file, line, column, message, severity) against the retained
September 11 inherited-override shard found no differences; that shard was
already identical to September 9. The specs revision, successful-project
set, one-sided project counts, and diagnostic identities are unchanged, so the
version attribution and detailed examples below still apply to this run.
This is observational evidence only; the new regressions expose a native shape
gap that the corpus counts did not reveal.

Six compile failures were excluded from both sides:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

## Project-set comparison

All 27 validator projects are overlap projects; the complete list is retained
in `corpus-evidence.json`. The four former validator-only projects are now
covered:

- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/ComponentAPIs`
- `specification/datadog/resource-manager/Microsoft.Datadog/Datadog`
- `specification/sql/resource-manager/Microsoft.Sql/SQL`
- `specification/support/resource-manager/Microsoft.Support/Support`

There are no final validator-only projects.

The raw TypeSpec-only projects are:

- `Batch`, `Cdn`, `ManagedNetworkFabric`, and `NetApp`: 19 diagnostics on
  declarations removed or renamed before the selected latest version. They are
  excluded from the selected-version comparison.
- `Informatica`: selected-version mismatches where a PATCH model property is
  absent from, or structurally inconsistent with, the emitted response model.
  These diagnostics are intentional; the Swagger validator silently misses the
  emitted violations.

The version attribution was rechecked against the pinned source:

| Project              | Selected API version | Raw findings excluded | Source evidence                                                                                                                            |
| -------------------- | -------------------- | --------------------: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Batch                | `2025-06-01`         |                     2 | `models.tsp:1981-1995`: certificate model removed in `v2025_06_01`.                                                                        |
| Cdn                  | `2026-04-01-preview` |                     1 | `KeyGroup.tsp:46-81`: PATCH interface removed in `v2025_12_01`; diagnostic on `models.tsp:3593`.                                           |
| ManagedNetworkFabric | `2025-07-15`         |                    15 | Deprecated PATCH properties or their containing property are removed/renamed in `v2024_06_15_preview` or `v2025_07_15`; see example below. |
| NetApp               | `2026-05-15-preview` |                     1 | `Volume.tsp:1330-1346`: `usageThreshold20250901` removed/renamed at the selected preview version.                                          |

Excluding these 19 findings leaves 306 diagnostics across 28 projects: all
27 overlap projects plus Informatica. This is a **one-sided version-filtered
population**, not a globally projected latest-version run. Versioning can also
rename properties, so the unprojected deprecated names do not prove violations
in the older emitted API versions either.

## Diagnostic cardinality

| Identity                                          | Validator | TypeSpec |
| ------------------------------------------------- | --------: | -------: |
| Raw full-run diagnostics                          |       151 |      325 |
| Validator `project + Swagger file + JSON path`    |        48 |      N/A |
| Validator `project + JSON path`                   |        48 |      N/A |
| TypeSpec `project + source file + line + column`  |       N/A |      188 |
| After the documented one-sided version exclusions |       151 |      306 |

Eighteen overlap projects have equal raw counts. Across the other nine,
TypeSpec has 133 additional raw diagnostics and Swagger has none. The largest
differences come from multiple versions and operations sharing source models,
plus diagnostic granularity: Swagger can report one parent property at an
operation body path while TypeSpec reports its individual missing leaves. The
two identity domains cannot be safely collapsed into a one-to-one key.

Across all 32 affected projects, raw positive differences sum to 174 and
negative differences to zero. After the separate identity-based deduplications,
nine projects have equal counts, 22 are TypeSpec-higher, and SQL is
validator-higher; positive differences sum to 142 and negative differences to
2, giving 188 versus 48. SQL has four operation paths but only two reused
authored `operations` properties. EdgeOrder is the largest deduplicated
TypeSpec-higher outlier: three parent-property messages share one Swagger path,
while TypeSpec reports 25 authored leaves.

## Emission matrix

AutoRest's `getSchemaOrRef` selects inline or referenced schemas,
`getSchemaForModel` emits in-scope payload properties, and `resolveProperty`
emits nested property schemas. The Swagger rule's `diffSchema` recursively
compares the resulting `properties` maps.

| Authored shape                                                      | Emitter branch / selected OpenAPI field                                                                           | Swagger result | TypeSpec result                     | Fixture                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------- | ------------------------------------------- |
| PATCH model has a property at the wrong level                       | `getSchemaForModel` emits it in body schema `properties`; PATCH `200` response selected                           | violation      | violation                           | `inconsistent-patch`                        |
| Nested PATCH-only property                                          | `resolveProperty` emits nested model `properties`                                                                 | violation      | violation                           | `nested-extra-property`                     |
| Custom ARM PATCH outside lifecycle registration                     | operation body and response schemas use `getSchemaOrRef`                                                          | violation      | violation                           | `custom-patch-operation`                    |
| PATCH has only a `201` resource response                            | response schema for `201` is selected                                                                             | violation      | violation                           | `patch-201-response`                        |
| PATCH lacks `200`/`201`; same-path GET has `201`                    | PATCH body emitted; GET `201` response is fallback                                                                | violation      | violation                           | `get-201-fallback`                          |
| PATCH lacks `200`/`201`; same-path GET has `200`                    | GET `200` response is fallback                                                                                    | clean          | clean                               | `async-get-fallback`                        |
| PATCH has scalar `200` and model `201` responses                    | Existing `200` schema wins before its shape is interpreted                                                        | violation      | violation                           | `response-precedence`                       |
| PATCH response range contains `200`                                 | AutoRest emits the full `2XX` range while TypeSpec HTTP retains `{ start: 200, end: 299 }`                        | validator miss | violation                           | focused rule unit tests                     |
| Exact PATCH `200` overlaps a containing range                       | Explicit `200` response takes precedence over the range regardless of declaration order                           | violation      | violation                           | focused rule unit tests                     |
| Different source names encode to the same JSON name                 | `resolveProperty` uses the encoded property name                                                                  | clean          | clean                               | `payload-property-shape`                    |
| Nullable object properties have different nested properties         | nullable single-model unions emit object `properties`                                                             | violation      | violation                           | `nullable-object-mismatch`                  |
| Nullable object properties have matching nested properties          | nullable single-model unions emit matching object `properties`                                                    | clean          | clean                               | `nullable-object-match`                     |
| Same-named array and scalar properties                              | neither property schema emits named `properties`                                                                  | clean          | clean                               | `non-model-property-shape`                  |
| PATCH-only property scoped to C#                                    | AutoRest `isInScope` omits it from the PATCH schema                                                               | clean          | violation                           | `scoped-property`                           |
| Same-path GET scoped to C#                                          | AutoRest omits the GET route, so PATCH has no fallback schema                                                     | clean          | violation                           | `scoped-get-fallback`                       |
| PATCH operation scoped to C#                                        | AutoRest filters the route; no PATCH operation reaches the validator                                              | clean          | violation                           | `scoped-patch-operation`                    |
| Matching response property scoped to C#                             | AutoRest omits the response property but retains the PATCH property                                               | violation      | clean                               | `scoped-response-property`                  |
| Undeclared PATCH discriminator                                      | `getSchemaForModel` synthesizes the discriminator as a required string property                                   | violation      | violation                           | `synthesized-discriminator`                 |
| Authored property encodes to a synthesized discriminator name       | `resolveProperty` overwrites the synthesized property with the authored property's schema                         | violation      | violation                           | `encoded-discriminator-property`            |
| Valid PATCH inheritance overrides a base property with `never`      | `getSchemaForModel` omits the override but retains `allOf` and the base property                                  | violation      | clean                               | `never-patch-override`                      |
| Valid response inheritance overrides a base property with `never`   | `getSchemaForModel` omits the override but retains `allOf` and the base property                                  | clean          | violation                           | `never-resource-override`                   |
| Inherited PATCH object encodes to the derived discriminator name    | Derived synthetic string shadows the base object in emitted `allOf` merging; native authored object wins          | clean          | violation                           | `inherited-encoded-discriminator-patch`     |
| Inherited response object encodes to the derived discriminator name | Derived synthetic string shadows the base object in emitted `allOf` merging; native authored object wins          | violation      | clean                               | `inherited-encoded-discriminator-response`  |
| Inherited discriminator source name encodes differently             | Effective authored source-name lookup prevents a second native discriminator; emission is not the native contract | not asserted   | clean when the encoded name matches | native authored-discriminator tests         |
| Valid redeclaration changes an inherited property's encoded name    | Native source-name lookup selects only the derived declaration; emission is not the native contract               | not asserted   | clean when the new name matches     | native inherited-override tests             |
| Same-level PATCH subset                                             | corresponding property exists in response schema                                                                  | clean          | clean                               | `same-level-subset`                         |
| PATCH has no body or no PATCH/GET `200`/`201` schema                | selected comparison schema is absent                                                                              | clean          | clean                               | guarded directly by body/response selection |

Inherited properties and spreads reach the same model/property emitter
branches. Arrays, records, scalar leaves, and empty objects have no named
`properties` at that point in the recursive comparison; neither rule treats
their elements, arbitrary record keys, or scalar values as named PATCH
properties. Operation and property scope are deliberately not projected to an
emitter-specific contract. Undeclared discriminators use compiler metadata and
are represented by the model that causes AutoRest
to synthesize them. Cycles are guarded by active model-pair traversal without
suppressing repeated authored occurrences on sibling paths.

## Gap examples: emitter scope is outside the native contract

The following examples are from the checked-in comparison fixtures at API
version `2024-01-01` for the two existing fixtures and `0000-00-00` for the two
new unversioned fixtures. Schema excerpts omit descriptions only. Each native
outcome also has a direct unit assertion; comparison snapshots alone are not
the acceptance criterion.

### PATCH request property omitted by AutoRest

- **Classification:** TypeSpec-only
- **Status:** intentional
- **Project/API version:** fixture `scoped-property` / `2024-01-01`
- **Source:** `scoped-property/main.tsp`, `WidgetPatchProperties.clientOnly`

```typespec
model WidgetPatchProperties {
  @scope("csharp")
  clientOnly?: string;
}
```

AutoRest emits `"WidgetPatchProperties": { "type": "object" }`, with no
`properties` map. The native model still contains `clientOnly`.

| Engine            | Observed result                                                          |
| ----------------- | ------------------------------------------------------------------------ |
| Swagger validator | No finding: the property is absent from the PATCH schema.                |
| TypeSpec lint     | One finding for `properties.clientOnly`, absent from the response model. |

**Disposition:** retain the native finding and partial-coverage classification;
do not import downstream scope helpers into an ARM lint.

### GET fallback omitted by AutoRest

- **Classification:** TypeSpec-only
- **Status:** intentional
- **Project/API version:** fixture `scoped-get-fallback` / `2024-01-01`
- **Source:** `scoped-get-fallback/main.tsp`, `CustomWidgetOperations.read`

```typespec
@get
@scope("csharp")
read(...ResourceInstanceParameters<Widget>): WidgetResponse | ErrorResponse;

@patch
update(...ResourceInstanceParameters<Widget>, @body body: WidgetPatchBody):
  | AcceptedResponse
  | ErrorResponse;
```

The emitted widget-item path has only `patch`; its responses are `202` and
`default`, with no eligible resource schema. The same-path GET exists in the
native HTTP graph and returns the resource whose `displayName` is nested under
`properties`, unlike the PATCH body.

| Engine            | Observed result                                                                  |
| ----------------- | -------------------------------------------------------------------------------- |
| Swagger validator | No finding: neither PATCH nor an emitted GET supplies a `200`/`201` schema.      |
| TypeSpec lint     | One finding for the wrongly nested `displayName`, using the native GET fallback. |

**Disposition:** retain native GET selection; emitted route visibility is not a
native semantic condition.

### PATCH endpoint omitted by AutoRest

- **Classification:** TypeSpec-only
- **Status:** intentional
- **Project/API version:** fixture `scoped-patch-operation` / `0000-00-00`
- **Source:** `scoped-patch-operation/main.tsp`, `update`

```typespec
@route("/widgets")
@patch
@scope("csharp")
op update(@body body: WidgetUpdate): Widget;
```

`WidgetUpdate` has `extra`; `Widget` has only `name`. The emitted `/widgets`
path has only `get`, so there is no PATCH object for the validator selector.

| Engine            | Observed result                                       |
| ----------------- | ----------------------------------------------------- |
| Swagger validator | No finding: the PATCH operation was not emitted.      |
| TypeSpec lint     | One finding for `extra` on the native PATCH endpoint. |

**Disposition:** retain endpoint checking independent of client scope.

### Matching response property omitted by AutoRest

- **Classification:** validator-only
- **Status:** intentional
- **Project/API version:** fixture `scoped-response-property` / `0000-00-00`
- **Source:** `scoped-response-property/main.tsp`, `Widget.description`

```typespec
model Widget {
  name?: string;

  @scope("csharp")
  description?: string;
}
model WidgetUpdate {
  description?: string;
}
```

```json
{
  "Widget": { "type": "object", "properties": { "name": { "type": "string" } } },
  "WidgetUpdate": { "type": "object", "properties": { "description": { "type": "string" } } }
}
```

| Engine            | Observed result                                                           |
| ----------------- | ------------------------------------------------------------------------- |
| Swagger validator | One finding for `description`, absent from the emitted response schema.   |
| TypeSpec lint     | No finding: `description` exists at the same level in both native models. |

**Disposition:** retain native compliance and the explicit reviewed validator
expectation. The validator is correct for the emitted schema; this is not a
validator false positive or proof of complete Swagger equivalence.

## Gap example: custom PATCH traversal

- **Classification:** validator-only
- **Status:** fixed
- **Project/API version:** `ComponentAPIs` / `2015-05-01`
- **Source:** `routes.tsp`, `WorkItemConfigurationsOperationGroup.updateItem`

**TypeSpec source**

```typespec
@patch(#{ implicitOptionality: true })
updateItem(
  @bodyRoot WorkItemConfigurationProperties: WorkItemCreateConfiguration,
): ArmResponse<WorkItemConfiguration> | never;
```

**Emitted OpenAPI**

```json
{
  "WorkItemCreateConfiguration": {
    "properties": {
      "ConnectorDataConfiguration": { "type": "string" },
      "ValidateOnly": { "type": "boolean" },
      "WorkItemProperties": { "type": "object" }
    }
  }
}
```

| Engine            | Observed result                                                                     |
| ----------------- | ----------------------------------------------------------------------------------- |
| Swagger validator | Three diagnostics because these properties are absent from `WorkItemConfiguration`. |
| TypeSpec lint     | Three matching diagnostics after HTTP PATCH traversal was added.                    |

**Explanation:** this legacy provider operation is not a registered ARM
resource lifecycle update, so `getArmResources()` did not expose it.

**Disposition:** traverse all HTTP PATCH operations in ARM provider namespaces.

## Gap example: older-version declaration

- **Classification:** TypeSpec-only
- **Status:** population mismatch
- **Project/API version:** `Batch` / `2025-06-01`
- **Source:** `models.tsp`, `CertificateCreateOrUpdateProperties`

**TypeSpec source**

```typespec
@removed(Versions.v2025_06_01)
model CertificateCreateOrUpdateProperties extends CertificateBaseProperties {
  @visibility(Lifecycle.Read, Lifecycle.Update)
  data: string;

  password?: string;
}
```

**Version behavior**

The source-program lint reports `properties.data` and `properties.password`,
but the containing certificate model is removed in `v2025_06_01`; it is absent
from the retained latest Swagger.

| Engine            | Observed result                                                                    |
| ----------------- | ---------------------------------------------------------------------------------- |
| Swagger validator | No diagnostic because the selected emitted version has no certificate PATCH shape. |
| TypeSpec lint     | Two raw source-program diagnostics from older declarations.                        |

**Disposition:** exclude these diagnostics from selected-version comparison;
do not weaken the production lint.

### Versioning subcase: removed and renamed PATCH properties

- **Classification:** TypeSpec-only
- **Status:** population mismatch
- **Project/API version:** `ManagedNetworkFabric` / `2025-07-15`
- **Source:** `models/NetworkToNetworkInterconnect.tsp:260-262`

```typespec
@removed(Versions.v2025_07_15)
@renamedFrom(Versions.v2025_07_15, "prefixLimits")
prefixLimitsDeprecated?: OptionBLayer3PrefixLimitPatchProperties[];
```

The raw program reports
`properties.optionBLayer3Configuration.prefixLimitsDeprecated`. The selected
version removes this declaration and uses the separately added `prefixLimits`
property. The same pattern accounts for the deprecated properties in
`InternalNetwork.tsp`, `common.tsp`, `NetworkTapRule.tsp`, and
`L3IsolationDomain.tsp`; two findings under `aggregateRouteConfigurationDeprecated`
are removed with their containing property in `v2024_06_15_preview`.

| Engine            | Observed result                                                   |
| ----------------- | ----------------------------------------------------------------- |
| Swagger validator | No corresponding deprecated property in the selected emitted API. |
| TypeSpec lint     | Fifteen raw findings across removed/renamed PATCH declarations.   |

**Disposition:** exclude these source-program findings from the selected-version
project comparison. A renamed source property is not evidence of an invalid
older emitted property name.

## Gap example: validator misses an emitted violation

- **Classification:** TypeSpec-only
- **Status:** intentional
- **Project/API version:** `Informatica` / `2025-11-27`
- **Source:** `main.tsp`, `OrganizationPropertiesCustomUpdate`

**TypeSpec source**

```typespec
model OrganizationPropertiesCustomUpdate {
  informaticaOrganizationProperties?: InformaticaOrganizationResourceUpdate;
  marketplaceDetails?: MarketplaceDetailsUpdate;
  existingResourceId?: Azure.Core.armResourceIdentifier<[]>;
}
```

**Emitted OpenAPI**

```json
{
  "InformaticaOrganizationResource": {
    "properties": {
      "properties": { "$ref": "#/definitions/OrganizationProperties" }
    }
  },
  "OrganizationPropertiesCustomUpdate": {
    "properties": {
      "informaticaOrganizationProperties": {
        "$ref": "#/definitions/InformaticaOrganizationResourceUpdate"
      },
      "existingResourceId": { "type": "string" }
    }
  }
}
```

| Engine            | Observed result                                                |
| ----------------- | -------------------------------------------------------------- |
| Swagger validator | No diagnostic despite the mismatched selected-version schemas. |
| TypeSpec lint     | Reports 22 missing or wrongly nested authored properties.      |

**Disposition:** retain the TypeSpec findings; they enforce the documented
same-level subset contract and expose a validator false negative.

The selected Swagger was rechecked in this repair: `Organizations_Update`
uses `InformaticaOrganizationResourceUpdate` as its body and
`InformaticaOrganizationResource` as its `200` response. The former references
`OrganizationPropertiesCustomUpdate`; the latter references
`OrganizationProperties`, which has `informaticaProperties` rather than
`informaticaOrganizationProperties` and no `existingResourceId`. Retained
validator output contains no execution error and no rule finding. This proves
the observed omission and schema mismatch, but not the internal reason the
validator omitted the findings; that mechanism remains unisolated.

## Gap example: emitted occurrence versus source target

- **Classification:** count-only
- **Status:** intentional
- **Project/API version:** `ApiManagement` / `2025-09-01-preview`
- **Source:** `models.tsp`, lines 9317, 9322, and 10585

**Observed identities**

```json
{
  "validatorDiagnostics": 3,
  "typeSpecDiagnostics": 5,
  "typeSpecSourceIdentities": 3
}
```

| Engine            | Observed result                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| Swagger validator | Reports one body-path occurrence for each of three PATCH operations.                                               |
| TypeSpec lint     | Reports five raw diagnostics, but only three source locations; two source properties are reused by two operations. |

**Disposition:** preserve raw counts and source identities separately. Do not
deduplicate by property name or require count equality.

### Count-only outlier: SQL shares two properties across four routes

- **Classification:** count-only
- **Status:** intentional
- **Project/API version:** `SQL` / `2025-02-01-preview`
- **Source:** `models.tsp:11883-11885` and `11930-11932`

```typespec
model SensitivityLabelUpdateList {
  operations?: SensitivityLabelUpdate[];
}
model RecommendedSensitivityLabelUpdateList {
  operations?: RecommendedSensitivityLabelUpdate[];
}
```

The validator reports `operations` at four distinct PATCH body schema paths:
`currentSensitivityLabels` and `recommendedSensitivityLabels`, each under both
`managedInstances/.../databases` and `servers/.../databases`. TypeSpec also
reports four raw findings, but repeats the two source locations above.

| Engine            | Observed result                                         |
| ----------------- | ------------------------------------------------------- |
| Swagger validator | Four raw findings and four file-independent JSON paths. |
| TypeSpec lint     | Four raw findings and two source identities.            |

**Disposition:** do not mistake source reuse for two missed operations.

### Count-only outlier: EdgeOrder reports parents versus leaves

- **Classification:** count-only
- **Status:** intentional
- **Project/API version:** `EdgeOrder` / `2024-02-01`
- **Source:** `models.tsp:2471-2485`, `OrderItemUpdateProperties`

```typespec
model OrderItemUpdateProperties {
  forwardAddress?: AddressProperties;
  preferences?: Preferences;
  notificationEmailList?: string[];
}
```

The validator reports `properties.forwardAddress`, `properties.preferences`,
and `properties.notificationEmailList`, all at the same order-item PATCH body
schema path. Native lint expands the missing object properties to authored
leaves such as `properties.forwardAddress.shippingAddress.streetAddress1`;
the array `notificationEmailList` remains a single target.

| Engine            | Observed result                                                |
| ----------------- | -------------------------------------------------------------- |
| Swagger validator | Three parent-property messages, sharing one JSON path.         |
| TypeSpec lint     | Twenty-five authored-property messages at 25 source locations. |

**Disposition:** preserve this existing diagnostic granularity, not a fabricated
one-to-one identity between operation schema paths and source properties.

## Focused validation

The repair's 22 fixture snapshots were refreshed and then checked without
snapshot updates. There are nine matching violation cases, five matching
rule-compliant controls, five intentional TypeSpec-only cases, and three
reviewed validator-only cases. The four inheritance cases add two discrepancies
in each direction to the four existing scope cases. The harness labels the TypeSpec-only cases
as mapped diagnostics in validator-clean fixtures; that warning is explained,
not suppressed or reclassified as equivalence. One pre-existing non-model
control still has unreviewed ambient diagnostics, unrelated to this rule.

Twenty-three native unit cases pass: seven authored-discriminator cases,
seven inherited-override regressions, the two
existing response-range regressions, three model-comparison cases without
AutoRest or the client generator core, and four existing client-scope
regressions. Package build and changed-file lint pass. The full corpus
completed with exit code zero; the six project compile failures above are
retained and excluded, not counted as successful comparisons.

The comparison runs exposed four new native/emitted inheritance
differences; the fixture expectations now record those reviewed outcomes rather
than claiming parity. A one-project Informatica run succeeded before the full
run. The legacy corpus runner invokes `npm link`, so the completed runs used
a session-local `npm_config_prefix` to isolate its link registry; the specs
package's resolved path was checked against this source worktree. An initial
setup-only attempt was interrupted before corpus generation and is not counted
as a completed run. No harness implementation was changed.
