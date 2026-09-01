# ParametersSchemaAsTypeObject migration investigation

## Conclusion

The migrated TypeSpec rule required a further repair. The Swagger rule rejects every
explicit request-body `schema.type` other than `object`. The former TypeSpec
implementation missed named models derived from arrays and could lose
diagnostics when an ARM template supplied the body property. It also reported
synthetic `void` bodies and `unknown` bodies that the Swagger JSONPath does not
select. A subsequent promotion review found that it also reported nullable
object bodies even though AutoRest emits the object schema reference with
`x-nullable` and no non-object `type`.

After correcting those differences, including emitted union handling, the full
corpus run at specs commit
`f6b53f105b95da05276530a0754a1c71b4f16397`, generated at
`2026-09-01T02:59:51.460Z`, produced 9 Swagger projects, 9 TypeSpec projects,
9 overlapping projects, and no one-sided projects in the successfully compiled
population. The migrated TypeSpec rule is functionally equivalent to the
Swagger rule for natively observable schemas in the assessed population.

Raw diagnostic equality is not the acceptance criterion. Swagger reports
emitted OpenAPI paths, while TypeSpec reports semantic source targets. Here the
18 Swagger diagnostics and 19 raw TypeSpec diagnostics both reduce to 18 under
their respective conservative identities.

External schemas supplied through AutoRest `@useRef` remain an observability
boundary. TypeSpec exposes only the opaque reference URL, while the Swagger
validator can resolve that URL and inspect the referenced schema. A
pathological model reference to an external primitive schema could therefore
be diagnosed only by Swagger. Diagnosing every `@useRef` model would incorrectly
reject its intended object-schema use cases, and no compiler or AutoRest API
provides the referenced JSON schema type without external I/O. No such case
appears in the aligned corpus; the equivalence conclusion excludes it.

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
6. Treat a union containing exactly one object model and `null` as an object
   schema, matching AutoRest's emitted `$ref` plus `x-nullable`.
7. Normalize any union with one effective non-null variant before applying the
   object, `unknown`, and `void` checks. AutoRest emits the underlying schema
   for singleton unions and adds `x-nullable` when needed.
8. Use the same union-enum classification as AutoRest for multi-variant unions.
   Ignore unsupported unions that emit `{}`, but continue diagnosing unions that
   emit string or number enum schemas.
9. Classify all request-body type families against AutoRest's emitted
   `schema.type`, rather than treating every non-model type as an explicit
   non-object schema.
10. Ignore unbased custom scalars and empty enums because AutoRest emits `{}` for
    both; retain diagnostics for standard-based scalars, non-empty enums,
    literals, string templates, enum members, union variants, and tuples.
11. Diagnose file bodies because AutoRest emits `type: string` with
    `format: binary`; continue ignoring multipart bodies because OpenAPI 2 emits
    their parts as form-data parameters without body schemas.
12. Account for `@encode` and validator reference resolution. A non-empty
    scalar encoding can add an explicit schema type even when the scalar is
    unbased. An empty encoding also adds a type when the encode-as scalar has a
    direct or encoding-derived format, but not for an unformatted scalar such as
    `string`. Secret scalars contribute the supported `password` format.
    Unsupported formats are diagnosed and not retained, but AutoRest still
    replaces the schema type with the encode-as scalar's type. An encoding on a
    model property backed by a referenced scalar or named union, including
    nullable wrappers, emits the type beside `$ref`; the resolved Swagger
    selector follows the referenced schema and classifies its resolved type
    rather than that sibling. The same property encoding replaces the schema
    type when the resolved underlying schema is inline.

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
| Refreshed full corpus after this repair                  | Same specs commit; generated `2026-09-01T02:59:51.460Z`; full run over 462/468 successful projects          | 462 successful projects, 215 known validator rules | `ParametersSchemaAsTypeObject production`      |                9 |                 9 |                     9 |                   0 |             0 | 18 Swagger, 19 TypeSpec |

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

### Gap example: nullable object body

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** focused fixture / `2024-01-01`
- **Source:** `nullable-object-body/main.tsp`, `Widgets.doAction`

**TypeSpec source**

```typespec
@body body: ActionRequest | null
```

**Emitted OpenAPI**

```json
{
  "schema": {
    "$ref": "#/definitions/ActionRequest",
    "x-nullable": true
  }
}
```

| Engine            | Observed result                                                                  |
| ----------------- | -------------------------------------------------------------------------------- |
| Swagger validator | No diagnostic because the resolved object schema does not have a non-object type |
| TypeSpec lint     | Formerly diagnosed the union; now no diagnostic                                  |

**Explanation:** AutoRest unwraps a nullable union with one non-null option,
emits the underlying object schema, and adds `x-nullable`. Nullability does not
change the schema type selected by the validator JSONPath.

**Disposition:** Unwrap the nullable union for object-schema classification.
The `nullable-object-body` fixture preserves this compliant boundary.

### Gap example: single-effective-variant unions

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** focused fixture / `2024-01-01`
- **Source:** `single-variant-unions/main.tsp`, `Widgets.submitObject` and `Widgets.submitUnknown`

A singleton union containing an object model emits the model's object schema. A
nullable union whose only non-null variant is `unknown` emits a schema with
`x-nullable` but no `type`. Neither output is selected by the Swagger rule.

**Disposition:** Normalize unions with exactly one non-null variant before
applying the existing object and untyped-schema exemptions. The
`single-variant-unions` fixture covers both emitted-schema branches.

### Gap example: unsupported and enum unions

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** focused fixtures / `2024-01-01`
- **Source:** `unsupported-union-body/main.tsp` and `enum-union-body/main.tsp`

AutoRest emits `{}` for a union of unrelated model types and reports its own
`union-unsupported` diagnostic. Because the emitted body schema has no `type`,
the Swagger selector ignores it. In contrast, a union of same-kind literals is
emitted as a string or number enum schema and the Swagger rule diagnoses its
non-object `type`.

**Disposition:** Reuse Azure Core's `getUnionAsEnum`, which AutoRest itself uses,
to distinguish emitted enum schemas from unsupported untyped unions. Separate
fixtures preserve both the compliant and violating branches.

### Gap example: schema-less scalar and enum bodies

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** focused fixtures / `2024-01-01`
- **Source:** `unbased-scalar-body/main.tsp` and `empty-enum-body/main.tsp`

**TypeSpec source**

```typespec
scalar OpaqueRequest;
enum EmptyRequest {}
```

**Emitted OpenAPI**

```json
{
  "OpaqueRequest": {},
  "EmptyRequest": {}
}
```

| Engine            | Observed result                                                         |
| ----------------- | ----------------------------------------------------------------------- |
| Swagger validator | No diagnostic because the resolved body schemas have no `type` property |
| TypeSpec lint     | Formerly diagnosed both types; now no diagnostic                        |

**Explanation:** AutoRest emits a scalar type only when the scalar is standard
or eventually derives from a standard scalar. It also emits no type for an
empty enum and reports its own `union-unsupported` warning. The former generic
non-model fallback incorrectly assumed both shapes had explicit non-object
types.

**Disposition:** Mirror AutoRest's scalar-base and enum-member classifications.
The `explicit-schema-type-bodies` fixture provides the corresponding violating
controls for standard-based scalars, non-empty enums, and the other explicit
non-object type families.

### Gap example: file and encoded body schemas

- **Classification:** validator-only
- **Status:** fixed
- **Project/API version:** focused fixture / `2024-01-01`
- **Source:** `explicit-schema-type-bodies/main.tsp`

**TypeSpec source**

```typespec
@encode("custom", int32)
scalar EncodedRequest;

model UploadRequest extends TypeSpec.Http.File {}
```

**Emitted OpenAPI**

```json
{
  "encodedBody": {
    "type": "integer",
    "format": "int32"
  },
  "fileBody": {
    "type": "string",
    "format": "binary"
  }
}
```

| Engine            | Observed result                                                 |
| ----------------- | --------------------------------------------------------------- |
| Swagger validator | Diagnostics at both emitted non-object `schema.type` properties |
| TypeSpec lint     | Formerly missed these branches; now reports both bodies         |

**Explanation:** File bodies do not use the HTTP `single` body kind, but
AutoRest still emits a body schema with an explicit string type. Separately, a
non-empty scalar encoding can supply an explicit wire type for an otherwise
unbased scalar.

**Disposition:** Handle file bodies directly and inspect encoding metadata and
the encode-as scalar's effective schema on scalar ancestry. The compliant
`empty-encoded-scalar-body` fixture preserves the boundary where an empty
encoding to unformatted `string` does not cause AutoRest to assign
`schema.type`; the violating fixture includes empty encoding to formatted
`int32`, an encode-as scalar whose format comes from its own encoding, and an
unsupported encoding whose typed encode-as scalar still replaces `schema.type`.
It also proves that an unsupported nested format is not retained and therefore
does not erase an inherited primitive type. The compliant fixtures cover both
an untyped secret encode-as scalar, whose `password` format causes AutoRest to
erase the inherited type, and a based scalar whose unsupported encoding replaces
its inherited primitive type with an untyped encode-as scalar.
`multipart-body` preserves the non-body-schema branch.

### Gap example: encoded property reference resolution

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** focused fixture / `2024-01-01`
- **Source:** `encoded-model-property-body/main.tsp`

**TypeSpec source**

```typespec
scalar PropertyRequest;

model EncodedWire {
  @encode("custom", int32)
  payload: PropertyRequest;
}
```

**Emitted OpenAPI**

```json
{
  "schema": {
    "$ref": "#/definitions/PropertyRequest",
    "type": "integer",
    "format": "int32"
  }
}
```

| Engine            | Observed result                                                                |
| ----------------- | ------------------------------------------------------------------------------ |
| Swagger validator | No diagnostic; resolved-reference traversal does not select the sibling `type` |
| TypeSpec lint     | Initially reported the property encoding; now emits no diagnostic              |

**Explanation:** AutoRest applies the model-property encoding after resolving
the property type, producing a `$ref` with sibling type metadata. The validator
runs Spectral with resolved references, so its JSONPath observes the referenced
untyped definition rather than the sibling metadata.

**Disposition:** Unwrap the model property and classify the referenced schema
instead of treating property encoding alone as a validator-visible schema type.
Decide whether the outer type is referenced before normalizing anonymous
singleton and nullable union wrappers. For an inline underlying schema, retain
the property encoding as a violation because AutoRest applies it directly to
the selected schema object.

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

| Fixture                       | Swagger result                           | TypeSpec result               |
| ----------------------------- | ---------------------------------------- | ----------------------------- |
| `non-object-body`             | primitive POST body violation            | matching diagnostic           |
| `put-non-object-body`         | primitive PUT body violation             | matching diagnostic           |
| `named-array-model-body`      | named array body violation               | matching diagnostic           |
| `object-body`                 | no violation                             | no rule diagnostic            |
| `inline-object-body`          | no violation                             | no rule diagnostic            |
| `nullable-object-body`        | nullable object; no violation            | no rule diagnostic            |
| `single-variant-unions`       | singleton object and nullable unknown    | no rule diagnostic            |
| `unsupported-union-body`      | unsupported union emits no schema type   | no rule diagnostic            |
| `enum-union-body`             | string enum schema violation             | matching diagnostic           |
| `unbased-scalar-body`         | unbased and encoded scalars emit no type | no rule diagnostic            |
| `empty-enum-body`             | empty enum emits no schema type          | no rule diagnostic            |
| `empty-encoded-scalar-body`   | empty encoding emits no schema type      | no rule diagnostic            |
| `encoded-model-property-body` | resolved scalar reference is untyped     | no rule diagnostic            |
| `multipart-body`              | parts emit as form-data parameters       | no rule diagnostic            |
| `explicit-schema-type-bodies` | fourteen explicit non-object branches    | fourteen matching diagnostics |
| `no-body-action`              | no body and no violation                 | no rule diagnostic            |
| `unknown-body-action`         | body schema has no `type`; no violation  | no rule diagnostic            |

The seventeen-fixture suite covers five violating fixtures and twelve compliant fixtures.
Ambient diagnostics from other rules are declared in each fixture snapshot and
do not establish this rule's target identity.

## Final statement

For the aligned successful-project population, every Swagger project is
covered, there are no TypeSpec-only projects, the deduplicated identities are
18 to 18, and focused fixtures cover the fixed semantic branches. The migrated
TypeSpec rule is functionally equal to the implemented Swagger rule. The one
raw TypeSpec count difference is a duplicate source record, not unresolved rule
behavior.
