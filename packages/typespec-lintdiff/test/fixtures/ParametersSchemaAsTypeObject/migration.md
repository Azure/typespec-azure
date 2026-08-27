# ParametersSchemaAsTypeObject migration investigation

## Conclusion

The migrated TypeSpec rule required an update. The Swagger rule rejects every
explicit request-body `schema.type` other than `object`. The former TypeSpec
implementation missed named models derived from arrays and could lose
diagnostics when an ARM template supplied the body property. It also reported
synthetic `void` bodies and `unknown` bodies that the Swagger JSONPath does not
select.

After correcting those differences, the full corpus run at specs commit
`f6b53f105b95da05276530a0754a1c71b4f16397`, generated at
`2026-08-27T06:39:39.644Z`, produced 9 Swagger projects, 9 TypeSpec projects,
9 overlapping projects, and no one-sided projects in the successfully compiled
population. The migrated TypeSpec rule is functionally equivalent to the
Swagger rule for the assessed population.

Raw diagnostic equality is not the acceptance criterion. Swagger reports
emitted OpenAPI paths, while TypeSpec reports semantic source targets. Here the
18 Swagger diagnostics and 19 raw TypeSpec diagnostics both reduce to 18 under
their respective conservative identities.

## Required TypeSpec changes

1. Update `src/rules/parameters-schema-as-type-object.ts` to recognize arrays
   through model, base-model, and source-model ancestry.
2. Ignore `void` because ARM action templates use it to represent an absent
   request body.
3. Ignore `unknown` because it emits `schema: {}`, which has no `type` property
   and is therefore outside the Swagger rule's JSONPath.
4. Report on a project-owned body property when available and otherwise on the
   user-authored operation, so template-owned body properties do not suppress
   diagnostics as library-originated.
5. Add violating coverage for a named array model and compliant controls for
   `void` and `unknown` action requests.

No emitter, validator, corpus-generator, or comparison-normalization changes
are required.

## Existing official coverage

Azure Core registers `request-body-problem`, which rejects only a raw `Array`
request-body property. It does not cover other explicit primitive body schemas,
named array models, or the validator's complete non-object condition.
Official coverage is therefore **partial**, and this migration is limited to
the uncovered behavior.

## Report reconciliation

| Report                                                   | Source revision / generation                                                                                |                                         Population | Row                                            | Swagger projects | TypeSpec projects |               Overlap |                 Gap | TypeSpec-only |             Diagnostics |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------: | ---------------------------------------------- | ---------------: | ----------------: | --------------------: | ------------------: | ------------: | ----------------------: |
| `docs/coverage_old.md`                                   | External report snapshot; source URL is recorded in the file, but no spec or generator revision is provided |         450 compiled projects, 210 validator rules | `ParametersSchemaAsTypeObject none 9 4 0 44.4` |                9 |                 4 | not listed separately | not reconstructable |    not listed |              not listed |
| Checked-in `specs/coverage-breakdown.md` before this fix | Specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`; 462/468 successful projects                        | 462 successful projects, 215 known validator rules | `ParametersSchemaAsTypeObject production`      |                9 |                10 |                     4 |                   5 |             6 | 18 Swagger, 63 TypeSpec |
| Refreshed full corpus after this fix                     | Same specs commit; generated `2026-08-27T06:39:39.644Z`; full run over 462/468 successful projects          | 462 successful projects, 215 known validator rules | `ParametersSchemaAsTypeObject production`      |                9 |                 9 |                     9 |                   0 |             0 | 18 Swagger, 19 TypeSpec |

The reports answer different questions. The external report gives aggregate
coverage credit and does not expose the unmatched projects, so they cannot be
reconstructed from that report. The local report requires observed diagnostics
in the same successfully compiled project and records the complete project sets
in `specs/comparison-results.json`.

The old external and checked-in local rows both happened to show four locally
covered projects, but that agreement does not align their populations,
generation revisions, or coverage definitions. The refreshed local change from
4/9 to 9/9 is attributable to the production fixes described below, not to raw
count normalization.

## Aligned project comparison

The retained Swagger corpus validates the dataset-selected latest API version.
The TypeSpec run inspects the source program, which can include declarations
from multiple versions. No TypeSpec-only project remains, so no diagnostic was
excluded as older-version-only for the final project comparison.

All nine projects overlap:

- `specification/automation/Automation.Management`
- `specification/billing/resource-manager/Microsoft.Billing/Billing`
- `specification/cognitiveservices/CognitiveServices.Management`
- `specification/hdinsight/resource-manager/Microsoft.HDInsight/HDInsight`
- `specification/machinelearningservices/MachineLearningServices.Management`
- `specification/marketplace/resource-manager/Microsoft.Marketplace/Marketplace`
- `specification/newrelic/NewRelicObservability.Management`
- `specification/storagecache/resource-manager/Microsoft.StorageCache/StorageCache`
- `specification/vmware/resource-manager/Microsoft.AVS/AVS`

The six TypeSpec compile failures were:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

They are retained as unassessed projects and excluded from both sides of the
behavioral comparison. None has a retained Swagger finding for this rule, so
the failures do not remove a validator project from this rule's assessed set.

## Diagnostic cardinality

| Identity                                       | Count |
| ---------------------------------------------- | ----: |
| Swagger raw diagnostics                        |    18 |
| Swagger project + file + JSON path             |    18 |
| Swagger project + JSON path                    |    18 |
| TypeSpec raw diagnostics                       |    19 |
| TypeSpec project + source file + line + column |    18 |

Eight projects have equal raw counts. Automation has one Swagger diagnostic and
two identical TypeSpec records for `Runbook.tsp:138:7`; deduplicating by source
location produces one target. Total positive raw difference is 1, total
negative difference is 0, and the net difference is 1. After conservative
deduplication, every project has equal counts.

### Gap example: named array model

- **Classification:** validator-only
- **Status:** fixed
- **Project/API version:** `specification/cognitiveservices/CognitiveServices.Management` / `2026-07-01`
- **Source:** `models.tsp`, `RaiBlocklistItemsBulkAddRequest`

**TypeSpec source**

```typespec
model RaiBlocklistItemsBulkAddRequest is Array<RaiBlocklistItemBulkRequest>;

batchAdd is ArmResourceActionSync<
  RaiBlocklist,
  RaiBlocklistItemsBulkAddRequest,
  ArmResponse<RaiBlocklist>
>;
```

**Emitted OpenAPI**

```json
{
  "schema": {
    "$ref": "#/definitions/RaiBlocklistItemsBulkAddRequest"
  },
  "RaiBlocklistItemsBulkAddRequest": {
    "type": "array",
    "items": {
      "$ref": "#/definitions/RaiBlocklistItemBulkRequest"
    }
  }
}
```

| Engine            | Observed result                                                 |
| ----------------- | --------------------------------------------------------------- |
| Swagger validator | Diagnostic at the action body schema's resolved `type: "array"` |
| TypeSpec lint     | Formerly no diagnostic; now reports the user-authored action    |

**Explanation:** The HTTP body can be a visibility-transformed model whose
array origin is reachable through `sourceModel`. Checking only the immediate
model did not recognize that emitted non-object schema. In addition, the ARM
template can own the synthesized body property, so targeting only that property
causes the linter framework to treat the diagnostic as library-originated.

**Disposition:** Traverse model ancestry for array origins and fall back to the
user-authored operation when the body property is not project-owned. The
`named-array-model-body` fixture covers both decisions.

### Gap example: synthetic no-body action

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** focused fixture / `2024-01-01`
- **Source:** `no-body-action/main.tsp`, `Widgets.run`

**TypeSpec source**

```typespec
run is ArmResourceActionSync<Widget, void, ArmResponse<ActionResult>>;
```

**Emitted OpenAPI**

```json
{
  "operationId": "Widgets_Run",
  "parameters": [
    {
      "$ref": "../../../../../common-types/resource-management/v5/types.json#/parameters/ApiVersionParameter"
    },
    {
      "$ref": "../../../../../common-types/resource-management/v5/types.json#/parameters/SubscriptionIdParameter"
    },
    {
      "$ref": "../../../../../common-types/resource-management/v5/types.json#/parameters/ResourceGroupNameParameter"
    },
    {
      "name": "widgetName",
      "in": "path",
      "required": true,
      "type": "string"
    }
  ]
}
```

| Engine            | Observed result                                                            |
| ----------------- | -------------------------------------------------------------------------- |
| Swagger validator | No diagnostic because no body parameter is emitted                         |
| TypeSpec lint     | Formerly diagnosed the template's synthetic `void` body; now no diagnostic |

**Explanation:** ARM templates use `void` as a semantic placeholder for an
absent request. Treating it as an authored non-object body produced widespread
TypeSpec-only findings with no Swagger body node to inspect.

**Disposition:** Exclude `void`; retain this compliant fixture as the regression
control.

### Gap example: untyped schema without `type`

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** `specification/migrate/resource-manager/Microsoft.OffAzure/OffAzure` / `2024-12-01-preview`
- **Source:** `HypervSite.tsp`, `computeErrorSummary`

**TypeSpec source**

```typespec
computeErrorSummary is ArmResourceActionSync<
  HypervSite,
  unknown,
  ArmResponse<SiteErrorSummary>
>;
```

**Emitted OpenAPI**

```json
{
  "name": "body",
  "in": "body",
  "required": true,
  "schema": {}
}
```

| Engine            | Observed result                                                    |
| ----------------- | ------------------------------------------------------------------ |
| Swagger validator | No diagnostic because `schema` has no `type` property              |
| TypeSpec lint     | Intermediate rule version diagnosed `unknown`; final rule does not |

**Explanation:** The validator JSONPath selects
`schema[?(@property === 'type' && @ !== 'object')]`. An empty schema is outside
that selection even though it is not an object schema.

**Disposition:** Exclude `unknown` to preserve the validator's implemented
behavior. The `unknown-body-action` fixture records this limitation.

### Gap example: duplicated semantic report

- **Classification:** count-only
- **Status:** intentional
- **Project/API version:** `specification/automation/Automation.Management` / `2024-10-23`
- **Source:** `Runbook.tsp:138`, `runbookContent`

**TypeSpec source**

```typespec
@bodyRoot
runbookContent: string;
```

**Emitted OpenAPI**

```json
{
  "name": "runbookContent",
  "in": "body",
  "required": true,
  "schema": {
    "type": "string"
  }
}
```

| Engine            | Observed result                                           |
| ----------------- | --------------------------------------------------------- |
| Swagger validator | One diagnostic at the emitted body `schema.type`          |
| TypeSpec lint     | Two raw records at the same source file, line, and column |

**Explanation:** The TypeSpec corpus records the same semantic source target
twice while the selected Swagger contains one emitted operation occurrence.
Both TypeSpec records have the exact source identity
`Runbook.tsp:138:7`.

**Disposition:** Preserve raw totals and report the conservative source-location
deduplication. No production-rule suppression is justified by a duplicate in
the comparison output.

## Fixture evidence

| Fixture                  | Swagger result                          | TypeSpec result     |
| ------------------------ | --------------------------------------- | ------------------- |
| `non-object-body`        | primitive POST body violation           | matching diagnostic |
| `put-non-object-body`    | primitive PUT body violation            | matching diagnostic |
| `named-array-model-body` | named array body violation              | matching diagnostic |
| `object-body`            | no violation                            | no rule diagnostic  |
| `inline-object-body`     | no violation                            | no rule diagnostic  |
| `no-body-action`         | no body and no violation                | no rule diagnostic  |
| `unknown-body-action`    | body schema has no `type`; no violation | no rule diagnostic  |

The seven-case suite covers three violating shapes and four compliant controls.
Ambient diagnostics from other rules are declared in each fixture snapshot and
do not establish this rule's target identity.

## Final statement

For the aligned successful-project population, every Swagger project is
covered, there are no TypeSpec-only projects, the deduplicated identities are
18 to 18, and focused fixtures cover the fixed semantic branches. The migrated
TypeSpec rule is functionally equal to the implemented Swagger rule. The one
raw TypeSpec count difference is a duplicate source record, not unresolved rule
behavior.
