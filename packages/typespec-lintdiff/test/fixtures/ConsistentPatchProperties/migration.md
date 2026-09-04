# ConsistentPatchProperties migration evidence

## Conclusion

The migrated TypeSpec rule is functionally equivalent to the intended Swagger
`ConsistentPatchProperties` behavior over the aligned, successfully compiled
corpus. The final full run covers all 27 validator projects. There are no
validator-only projects.

**TypeSpec rule update required:** yes. The previous implementation inspected
only registered ARM resource lifecycle updates. The Swagger rule inspects every
ARM PATCH operation, including legacy templates, custom provider operations,
and PATCH actions. The updated rule traverses ARM HTTP PATCH operations, selects
the PATCH response model containing status `200` or `201`, falls back to the
same-path GET response containing `200` or `201`, recursively compares body
properties at the same level, and reports the authored property. TypeSpec HTTP
can represent those statuses either as individual numbers or as members of a
status-code range.

The five remaining raw TypeSpec-only projects are explained. Nineteen
diagnostics come from older-version declarations absent from the retained
latest Swagger. Informatica also contains genuine selected-version violations
missed by the Swagger validator. Raw diagnostic equality is not required
because Swagger reports emitted operation/schema occurrences while TypeSpec
reports authored properties.

## Evidence revisions and populations

| Evidence                                                           | Revision and population                                                                                                                                   | `ConsistentPatchProperties` row                                                                                                                                           |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [External coverage snapshot](../../../docs/coverage_old.md)        | The checked-in snapshot links to its source gist but records no date, spec commit, or generator revision. It reports 450 compiled projects and 210 rules. | `lint`; 303 validator projects; 25 local-lint projects; 0 official projects; 8.3%. Project identities cannot be reconstructed from this aggregate row.                    |
| [Checked-in observed report](../../../specs/coverage-breakdown.md) | Specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`; 462/468 successfully compiled projects.                                                          | Before this change: `production`; 27 validator projects; 27 TypeSpec projects; 23 overlap; 4 validator-only; 4 TypeSpec-only; 151 validator and 122 TypeSpec diagnostics. |
| [Final retained evidence](./corpus-evidence.json)                  | Full review-fix run generated 2026-09-04 from the same specs commit; 462/468 projects compiled; duration 1,261,930 ms.                                    | 27 validator projects; 32 raw TypeSpec projects; 27 overlap; 0 validator-only; 5 raw TypeSpec-only; 151 validator and 325 raw TypeSpec diagnostics.                       |

The external report uses an unidentified older population and aggregate
migration credit. The observed reports require same-project diagnostics on the
pinned successful-project population. The final TypeSpec diagnostic count also
includes every declared API version; the validator dataset retains one selected
version per project.

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

The selected-version TypeSpec population therefore contains 306 diagnostics
across 28 projects: all 27 overlap projects plus one intentional TypeSpec-only
project.

## Diagnostic cardinality

| Identity                                         | Validator | TypeSpec |
| ------------------------------------------------ | --------: | -------: |
| Raw full-run diagnostics                         |       151 |      325 |
| Validator `project + JSON path`                  |        48 |      N/A |
| TypeSpec `project + source file + line + column` |       N/A |      188 |
| Selected-version diagnostics                     |       151 |      306 |

Eighteen overlap projects have equal raw counts. Across the other nine,
TypeSpec has 133 additional raw diagnostics and Swagger has none. The largest
differences come from multiple versions and operations sharing source models,
plus diagnostic granularity: Swagger can report one parent property at an
operation body path while TypeSpec reports its individual missing leaves. The
two identity domains cannot be safely collapsed into a one-to-one key.

## Emission matrix

AutoRest's `getSchemaOrRef` selects inline or referenced schemas,
`getSchemaForModel` emits in-scope payload properties, and `resolveProperty`
emits nested property schemas. The Swagger rule's `diffSchema` recursively
compares the resulting `properties` maps.

| Authored shape                                                | Emitter branch / selected OpenAPI field                                                    | Swagger result | TypeSpec result | Fixture                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------- | --------------- | ------------------------------------------- |
| PATCH model has a property at the wrong level                 | `getSchemaForModel` emits it in body schema `properties`; PATCH `200` response selected    | violation      | violation       | `inconsistent-patch`                        |
| Nested PATCH-only property                                    | `resolveProperty` emits nested model `properties`                                          | violation      | violation       | `nested-extra-property`                     |
| Custom ARM PATCH outside lifecycle registration               | operation body and response schemas use `getSchemaOrRef`                                   | violation      | violation       | `custom-patch-operation`                    |
| PATCH has only a `201` resource response                      | response schema for `201` is selected                                                      | violation      | violation       | `patch-201-response`                        |
| PATCH lacks `200`/`201`; same-path GET has `201`              | PATCH body emitted; GET `201` response is fallback                                         | violation      | violation       | `get-201-fallback`                          |
| PATCH lacks `200`/`201`; same-path GET has `200`              | GET `200` response is fallback                                                             | clean          | clean           | `async-get-fallback`                        |
| PATCH has scalar `200` and model `201` responses              | Existing `200` schema wins before its shape is interpreted                                 | violation      | violation       | `response-precedence`                       |
| PATCH response range contains `200`                           | AutoRest emits the full `2XX` range while TypeSpec HTTP retains `{ start: 200, end: 299 }` | validator miss | violation       | focused rule unit tests                     |
| Exact PATCH `200` overlaps a containing range                 | Explicit `200` response takes precedence over the range regardless of declaration order    | validator miss | violation       | focused rule unit tests                     |
| Different source names encode to the same JSON name           | `resolveProperty` uses the encoded property name                                           | clean          | clean           | `payload-property-shape`                    |
| Nullable object properties have different nested properties   | nullable single-model unions emit object `properties`                                      | violation      | violation       | `nullable-object-mismatch`                  |
| Nullable object properties have matching nested properties    | nullable single-model unions emit matching object `properties`                             | clean          | clean           | `nullable-object-match`                     |
| Same-named array and scalar properties                        | neither property schema emits named `properties`                                           | clean          | clean           | `non-model-property-shape`                  |
| PATCH-only property scoped to C#                              | AutoRest `isInScope` omits it from the PATCH schema                                        | clean          | clean           | `scoped-property`                           |
| Same-path GET scoped to C#                                    | AutoRest omits the GET route, so PATCH has no fallback schema                              | clean          | clean           | `scoped-get-fallback`                       |
| Undeclared PATCH discriminator                                | `getSchemaForModel` synthesizes the discriminator as a required string property            | violation      | violation       | `synthesized-discriminator`                 |
| Authored property encodes to a synthesized discriminator name | `resolveProperty` overwrites the synthesized property with the authored property's schema  | violation      | violation       | `encoded-discriminator-property`            |
| Same-level PATCH subset                                       | corresponding property exists in response schema                                           | clean          | clean           | `same-level-subset`                         |
| PATCH has no body or no PATCH/GET `200`/`201` schema          | selected comparison schema is absent                                                       | clean          | clean           | guarded directly by body/response selection |

Inherited properties and spreads reach the same model/property emitter
branches. Arrays, records, scalar leaves, and empty objects have no named
`properties` at that point in the recursive comparison; neither rule treats
their elements, arbitrary record keys, or scalar values as named PATCH
properties. Operation and property scope use AutoRest's TCGC emitter identity,
and undeclared discriminators are represented by the model that causes AutoRest
to synthesize them. Cycles are guarded by active model-pair traversal without
suppressing repeated authored occurrences on sibling paths.

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
- **Project/API version:** `Batch` / selected latest version after `2025-06-01`
- **Source:** `models.tsp`, `CertificateCreateOrUpdateProperties`

**TypeSpec source**

```typespec
@removed(Versions.v2025_06_01)
model CertificateCreateOrUpdateProperties {
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

## Focused validation

Sixteen fixture cases pass: nine violations and seven compliant controls. They cover
nested and moved properties, custom PATCH traversal, PATCH `201`, GET `200` and
`201` fallback, encoded JSON names, nullable objects, and a same-level subset.
Focused unit regressions additionally verify that the TypeSpec rule selects a
response status range containing `200` and prefers an overlapping exact `200`
response. The package build and diagnostic-noise audit also pass.
