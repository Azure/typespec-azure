# PatchBodyParametersSchema migration evidence

## Result and gap summary

The payload-kind repair removes false positives on multipart wrappers and file payloads:
HTTP `bodyKind` now limits property traversal to `single` bodies. Six native tests and
fifteen comparison fixtures pass; ordinary and nullable single models retain required,
default (including falsy values), and create-only checks. The new fixtures emit required
`formData` parameters or a primitive binary body schema, with no Swagger or TypeSpec
property-rule violations after the repair. Independent ARM non-JSON warnings remain.

The September 15 full corpus completed with 462 of 468 projects compiling: 703 Swagger
diagnostics in 93 projects versus 872 selected-version TypeSpec diagnostics in 105 projects,
with all 93 overlapping and no validator-only projects. These rule totals and the twelve
TypeSpec-only projects match the August 25 evidence. Six known compile-failure projects
remain excluded. Falsy defaults explain part of the difference; the remaining per-path
discrepancies are not fully classified, so coverage remains partial. Corpus counts alone
do not prove payload-kind coverage; the new native tests and emitted fixtures provide it.

## Current full corpus (September 15)

The existing `specs:typespec` runner used pinned specs commit
`f6b53f105b95da05276530a0754a1c71b4f16397`, no project filter or limit, and concurrency six.
A two-project smoke run passed first. The full run exited zero, generated its report at
`2026-09-15T05:41:34.365Z`, and finished at `2026-09-15T05:44:01.8726816Z`; recorded analysis
duration was 1,233,287 ms. Generated corpus files are validation artifacts, not source changes.

| Current result                                   |     Count |
| ------------------------------------------------ | --------: |
| Source projects                                  |       468 |
| Successfully compiled projects                   |       462 |
| Compile-failure projects                         |         6 |
| Validator projects / diagnostics                 |  93 / 703 |
| Selected-version TypeSpec projects / diagnostics | 105 / 872 |
| Same-project overlap                             |        93 |
| Validator-only projects                          |         0 |
| TypeSpec-only projects                           |        12 |

The twelve TypeSpec-only projects exactly match the [original aligned project list](#original-aligned-project-sets-august-25).
The six failed projects exactly match the [original failure list](#original-compile-failures-august-25).
They remain explicitly excluded from the aligned comparison; the runner's successful exit
does not mean every project compiled. There are no unassessed validator projects for this rule.

Across all rules and projects, including failed projects, recorded raw diagnostics total
51,831 and the runner reports 51,515 projected diagnostics. Those aggregate counts reflect
the current target branch's entire ruleset and are not attributed to this payload-kind fix.
The selected-version policy remains `http-reachable`; ordinary source linting is unchanged.
The twelve one-sided projects were not newly classified path by path in this repair: the
documented falsy-default explanation and remaining uncertainty still apply.

## Payload-kind repair evidence

The source repair is based on `feature/lintdiff-migration-new` commit
`274c4c327a4eef84ba6416281707dc9c2735781d`, after the original source PR was merged.
The source namespace-isolation guard and all property-checking semantics are unchanged.
The separate official-rule promotion's enablement-based applicability remains a promotion
adaptation, not part of this source repair.

Before the fix, emitter-free native tests reproduced two required-property warnings for
multipart `name`/`contents` parts and one warning for `File.contents`. The multipart-tuple,
single-binary, ordinary-model, and nullable-model controls passed. After the fix all six
tests pass. The initial test-host attempt lacked the ARM library's transitive
`@typespec/openapi` registration; adding that test library resolved setup without adding
any emitter or production dependency.

| Comparison fixture               | Emitted PATCH parameter                                                                            | Swagger / repaired TypeSpec result    |
| -------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `multipart-patch-body-compliant` | Required `name` string and `contents` file parameters, both `in: formData`; no wrapper body schema | Zero / zero property-rule diagnostics |
| `file-patch-body-compliant`      | Required `in: body` parameter with `{ "type": "string", "format": "binary" }` schema               | Zero / zero property-rule diagnostics |

The validator's `patch-body-parameters` function ignores parameters unless `in === "body"`
and a schema is present; a primitive binary schema has no properties to inspect. Production
code uses supported HTTP metadata, not emitted Swagger. The [payload-kind matrix](./rule.md#payload-kind-evidence)
distinguishes valid HTTP authoring from unrelated ARM guideline violations. These comparison
fixtures are not evidence that multipart or file updates satisfy all ARM guidelines.

The full fifteen-case fixture validation also refreshed this rule's pre-existing snapshots:
common-type references now use the fixture harness's stable repository-relative junction
path instead of a machine-specific external path. Reviewed ambient expectations reflect
the target branch's existing `parameters-schema-as-type-object` union handling and
`consistent-patch-properties` discriminator check; the `never` fixture now records its
previously unreviewed ambient diagnostics. No unrelated rule implementation changed.

## Original migration conclusion (historical)

The migrated TypeSpec rule required production and comparison-harness updates. The production rule now covers the Swagger rule's authorable required, default, and create-only branches; traverses model variants inside unions, including nullable top-level PATCH bodies; preserves project-owned diagnostic targets while traversing imported library models; and mirrors Swagger's top-level emitted-JSON `identity` exception. It uses the same HTTP metadata visibility and optionality APIs as the Autorest emitter, so it checks only properties present in the effective PATCH schema and reports required properties according to their emitted PATCH optionality.

The corpus comparison now projects opted-in rules to the dataset-selected API version and keeps only diagnostics reachable from that version's HTTP operations. Raw TypeSpec diagnostics remain recorded for audit. This is comparison-only behavior: ordinary linting still reports diagnostics for every authored version.

The final full corpus run reports all 93 validator projects in the TypeSpec set, with no validator-only projects. TypeSpec-only projects fell from 51 to 12 after selected-version reachability and emitted PATCH schema filtering were applied. The rule remains **partial** because the remaining TypeSpec-only findings include intentional detection of falsy defaults that Swagger misses and other source-to-emission differences that have not all been classified path by path.

## Original evidence provenance (August 25)

- Validator report: `packages/typespec-lintdiff/specs/validator-results.json`, generated from azure-rest-api-specs commit `f6b53f105b95da05276530a0754a1c71b4f16397` by the dataset recorded in `packages/typespec-lintdiff/specs/_meta.json`.
- TypeSpec report: local full run generated at `2026-08-25T04:55:45.589Z` from the same specs commit and this branch's review fixes documented below. Generated `packages/typespec-lintdiff/specs` artifacts were used as validation evidence only and intentionally excluded from this rule PR.
- Population: 468 source projects, 462 successful projects, and 6 compile failures. The full run took 1,267,110 ms.
- Raw/projected totals: 51,137 raw TypeSpec diagnostics and 51,000 selected-version projected diagnostics across all rules.
- Rule totals: 703 raw emitted Swagger diagnostics and 872 projected TypeSpec diagnostics.
- Deduplicated totals: not defined for this rule. `normalizedValidatorDiagnosticCount` and `normalizedTypeSpecDiagnosticCount` are `null` because emitted occurrences and semantic source targets do not have a proven one-to-one identity. No inferred deduplicated count is presented as evidence.

## Implemented changes

- Production rule: `src/rules/patch-body-parameters-schema.ts`
  - report `@visibility(Lifecycle.Create)` properties that emit exactly `x-ms-mutability: ["create"]`;
  - recurse into models nested in unions, including nullable nested models and nullable top-level PATCH bodies;
  - report imported-library violations at the nearest project-owned target;
  - skip a top-level PATCH body property whose emitted JSON name is `identity`;
  - resolve each operation's request visibility with `resolveRequestVisibility`;
  - use `MetadataInfo.isTransformed`, `isPayloadProperty`, and `isOptional` with the same canonical Read schema sharing policy as Autorest;
  - force authored discriminator properties required and report discriminator properties synthesized by Autorest;
  - omit `never`-typed properties that Autorest does not emit;
  - omit properties absent from the emitted PATCH schema while retaining defaults and exact create-only mutability when they remain in the emitted schema.
- Corpus harness:
  - declare selected-version comparison through `projectionScope: http-reachable`;
  - project the service to the dataset-selected API version and index source locations reachable from its HTTP operations;
  - retain the point-query rule's selected-version filter against projected query-parameter locations;
  - retain locationless and unrelated-rule diagnostics conservatively;
  - record raw and projected diagnostic totals separately;
  - retain the broader, rule-specific emitted-name normalization for `EnumInsteadOfBoolean` rather than forcing it through strict HTTP reachability.
- Fixtures:
  - required, create-only, discriminator, nullable-union, nullable-body, imported-model, and emitted top-level `identity` behavior remain covered;
  - `multi-model-union-compliant` covers unsupported multi-model unions that Autorest emits without traversable PATCH schema properties;
  - `synthesized-identity-discriminator-compliant` covers a top-level `identity` discriminator synthesized by Autorest and skipped by the Swagger rule;
  - `implicit-optional-patch-compliant` covers required and create-only source properties that are optional or omitted in a transformed PATCH schema;
  - `never-property-compliant` covers a required source property omitted because its type is `never`;
  - `default-patch-property` includes `false`, `0`, and `""` defaults to prove those valid TypeSpec findings are retained.

## Original full corpus (August 25)

The final full run used specs commit `f6b53f105b95da05276530a0754a1c71b4f16397` and was generated on `2026-08-25T04:55:45.589Z`.

| Population                                |  Count |
| ----------------------------------------- | -----: |
| Source projects                           |    468 |
| Successfully compiled projects            |    462 |
| Compile failures                          |      6 |
| Raw TypeSpec diagnostics, all rules       | 51,137 |
| Projected TypeSpec diagnostics, all rules | 51,000 |

The 137-diagnostic overall reduction includes selected-version HTTP reachability, point-query selected-version filtering, and the existing enum emitted-name normalization. It is not a `PatchBodyParametersSchema`-only count.

| PatchBodyParametersSchema result      | Count |
| ------------------------------------- | ----: |
| Validator projects                    |    93 |
| Selected-version TypeSpec projects    |   105 |
| Same-project overlap                  |    93 |
| Validator-only projects               |     0 |
| TypeSpec-only projects                |    12 |
| Validator diagnostics                 |   703 |
| Selected-version TypeSpec diagnostics |   872 |

Raw diagnostic equality is not expected: Swagger reports emitted OpenAPI occurrences, while TypeSpec reports semantic source properties that can be reused by multiple operations or versions.

As a cross-rule regression check, `EnumInsteadOfBoolean` returned to 293 validator projects, 293 TypeSpec projects, and 293 overlapping projects after preserving its rule-specific projection semantics.

## Code-backed gap examples

### Gap example: falsy defaults missed by Swagger

- **Classification:** TypeSpec-only
- **Status:** intentional
- **Project/API version:** fixture `default-patch-property` / `2024-01-01`
- **Source:** `WidgetPatchProperties.enabled`, `count`, and `label`

```typespec
enabled?: boolean = false;
count?: int32 = 0;
label?: string = "";
```

```json
{ "enabled": { "default": false }, "count": { "default": 0 }, "label": { "default": "" } }
```

| Engine            | Observed result                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Swagger validator | No diagnostics for the three falsy values because the validator tests `default` by truthiness. |
| TypeSpec lint     | Three default diagnostics because each authored default is defined.                            |

**Disposition:** Retain the TypeSpec findings; copying the validator's truthiness bug would weaken the guideline.

### Gap example: transformed PATCH optionality and omission

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** fixture `implicit-optional-patch-compliant` / `2025-01-01`
- **Source:** `WidgetProperties.description` and `createOnly`

```typespec
model WidgetProperties {
  description: string;
  @visibility(Lifecycle.Create) createOnly: string;
}
```

```json
"WidgetPropertiesUpdate": {
  "properties": { "description": { "type": "string" } }
}
```

| Engine            | Observed result                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Swagger validator | Clean: `description` is emitted optional and `createOnly` is absent from the update schema. |
| TypeSpec lint     | Clean after using `isOptional` and `isPayloadProperty` with PATCH visibility.               |

**Disposition:** Production rule fix; HTTP reachability alone cannot represent schema transformation.

### Gap example: discriminator requiredness

- **Classification:** validator-only
- **Status:** fixed
- **Project/API version:** fixture `discriminator-required-patch-property` / `2024-01-01`
- **Source:** `OptionalDiscriminator.kind`, `SynthesizedDiscriminator.kind`, and inherited `DerivedDiscriminator.kind`

```typespec
@discriminator("kind")
model OptionalDiscriminator {
  kind?: string;
}
@discriminator("kind")
model SynthesizedDiscriminator {}
@discriminator("kind")
model BaseSynthesizedDiscriminator {}
model DerivedDiscriminator extends BaseSynthesizedDiscriminator {
  kind: "derived";
}
```

```json
"OptionalDiscriminator": { "discriminator": "kind", "required": ["kind"] },
"SynthesizedDiscriminator": { "discriminator": "kind", "required": ["kind"] },
"BaseSynthesizedDiscriminator": { "discriminator": "kind", "required": ["kind"] },
"DerivedDiscriminator": { "allOf": [{ "$ref": "#/definitions/BaseSynthesizedDiscriminator" }] }
```

| Engine            | Observed result                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Three required-property diagnostics.                                                                             |
| TypeSpec lint     | Three matching diagnostics after mirroring Autorest's direct, synthesized, and inherited discriminator behavior. |

**Disposition:** Production rule fix and focused violating fixture.

### Gap example: `never` property omitted by Autorest

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** fixture `never-property-compliant` / unversioned service
- **Source:** `WidgetPatchBody.omitted`

```typespec
model WidgetPatchBody {
  omitted: never;
}
```

```json
"WidgetPatchBody": { "type": "object", "description": "Patch envelope for widget." }
```

| Engine            | Observed result                                    |
| ----------------- | -------------------------------------------------- |
| Swagger validator | Clean because no `omitted` property is emitted.    |
| TypeSpec lint     | Clean after skipping `isNeverType(property.type)`. |

**Disposition:** Production rule fix and focused compliant fixture.

### Gap example: nullable union traversal

- **Classification:** validator-only
- **Status:** fixed
- **Project/API version:** fixtures `nullable-body-required-property` and `nullable-model-required-property` / `2024-01-01`
- **Source:** nullable top-level `WidgetPatchBody | null`, `WidgetPatchBody.details`, and nested `requiredProp`

```typespec
@body body: WidgetPatchBody | null;
details?: WidgetPatchDetails | null;
model WidgetPatchDetails { requiredProp: string; }
```

| Engine            | Observed result                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| Swagger validator | Reports required properties inside nullable model references.                                                |
| TypeSpec lint     | Reports `requiredProp` and `details.requiredProp` after traversing model variants in root and nested unions. |

**Disposition:** Production recursive traversal fix.

### Gap example: imported-library diagnostic target

- **Classification:** validator-only
- **Status:** fixed
- **Project/API version:** `ConfidentialLedger`, `DevCenter`, and `HybridCompute` / dataset-selected versions
- **Source:** required PATCH properties declared in the imported ARM library

```text
Swagger target: emitted project PATCH schema
Original TypeSpec target: imported library ModelProperty (diagnostic discarded)
Fixed TypeSpec target: nearest project-owned PATCH model or operation
```

| Engine            | Observed result                                                                    |
| ----------------- | ---------------------------------------------------------------------------------- |
| Swagger validator | Reports the emitted required property in each project.                             |
| TypeSpec lint     | Reports after retargeting imported violations to the nearest project-owned target. |

**Disposition:** Production diagnostic-target fix. The final project overlap includes all three services.

### Gap example: selected-version population

- **Classification:** TypeSpec-only
- **Status:** population mismatch
- **Project/API version:** full corpus / dataset-selected API versions
- **Source:** diagnostics attached only to selected-out versions or declarations outside the selected HTTP graph

```yaml
projectionScope: http-reachable
```

```text
Raw TypeSpec diagnostics:       51,137
Projected TypeSpec diagnostics: 51,000
```

| Engine            | Observed result                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Evaluates the dataset-selected emitted API version.                                                                                   |
| TypeSpec lint     | Ordinary linting sees every authored version; comparison retains only selected-version HTTP-reachable diagnostics for opted-in rules. |

**Disposition:** Comparison projection only. Raw diagnostics remain recorded and normal lint behavior is unchanged.

## Original aligned project sets (August 25)

Validator-only projects: none.

TypeSpec-only projects after selected-version reachability and emitted PATCH schema filtering:

- `specification/apicenter/ApiCenter.Management`
- `specification/azuredatatransfer/resource-manager/Microsoft.AzureDataTransfer/AzureDataTransfer`
- `specification/billingbenefits/resource-manager/Microsoft.BillingBenefits/BillingBenefits`
- `specification/computeschedule/resource-manager/Microsoft.ComputeSchedule/ComputeSchedule`
- `specification/discovery/Discovery.Management`
- `specification/imagebuilder/resource-manager/Microsoft.VirtualMachineImages/ImageBuilder`
- `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/fluxConfigurations`
- `specification/mission/resource-manager/Microsoft.Mission/Mission`
- `specification/oracle/resource-manager/Oracle.Database/OracleDatabase`
- `specification/postgresql/DBforPostgreSQL.Management`
- `specification/programmableconnectivity/ProgrammableConnectivity.Management`
- `specification/reservations/resource-manager/Microsoft.Capacity/Reservations/Reservations`

The falsy-default subset is intentional TypeSpec coverage, not a false alert. Swagger checks `properties[prop].default` by truthiness and therefore misses emitted defaults such as `false`, `0`, and `""`. ApiCenter's `ServiceUpdateProperties.restore` with `default: false` is one concrete example. The TypeSpec rule checks `property.defaultValue !== undefined`, which enforces the stated rule for all authored defaults.

The previous AppLink finding was a false alert: its required source properties are emitted optional by `ArmResourcePatchAsync` through `implicitOptionality: true`. Azure Resilience Management exposed the second shape difference: `RecoveryPlanProperties.planType` is create-only in source but omitted from the transformed `RecoveryPlanPropertiesUpdate` schema. The production rule now uses the same metadata decisions as Autorest for both requiredness and payload membership. The generic corpus filter cannot solve either transformation because those source locations remain HTTP-reachable.

The other projects removed from the earlier 51-project TypeSpec-only set were diagnostics attached only to older selected-out versions or declarations unreachable from the selected version's HTTP graph. They are still available in raw corpus counts and remain visible during normal TypeSpec linting.

The remaining 12 projects have not all received a fresh per-path emitted-Swagger classification after projection. Known examples include valid falsy defaults and semantic source shapes that differ from emitted PATCH schemas. They are retained rather than suppressed without evidence.

## Former validator-only projects

The four validator-only projects in the pre-fix report had two concrete causes:

- `AccessReview`: nullable union variants contained required `type` properties, but the rule only recursed when the immediate property type was a model.
- `ConfidentialLedger`, `DevCenter`, and `HybridCompute`: the violations were declared by the imported ARM library. The compiler drops linter diagnostics targeted at library declarations, so the rule found the violations but its reports were discarded.

Union traversal and the project-owned target fallback fixed both causes. The final corpus confirms all four projects overlap with validator findings.

## Original compile failures (August 25)

The full corpus run had six TypeSpec compile failures, excluded from the aligned behavioral comparison:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

No `PatchBodyParametersSchema` validator-only project is hidden by these failures.

## Fixture evidence

The repository's fixture harness now validates fifteen cases:

- `required-patch-property`: Swagger and TypeSpec report the required property.
- `nullable-body-required-property`: Swagger and TypeSpec report a required property in a nullable top-level PATCH body.
- `default-patch-property`: Swagger reports the truthy default; TypeSpec additionally reports `false`, `0`, and `""` defaults by design.
- `create-only-patch-property`: Swagger and TypeSpec report the create-only property.
- `nullable-model-required-property`: Swagger and TypeSpec report a required property inside a nullable model.
- `discriminator-required-patch-property`: Swagger and TypeSpec report both an authored optional discriminator and a discriminator synthesized by Autorest as required.
- `top-level-identity-compliant`: both sides are clean for the skipped top-level `identity` shape.
- `synthesized-identity-discriminator-compliant`: both sides are clean when Autorest synthesizes a top-level `identity` discriminator that the Swagger rule skips.
- `encoded-identity-compliant`: both sides are clean when an authored property emits as top-level JSON `identity`.
- `encoded-non-identity-violating`: Swagger and TypeSpec both check an authored `identity` property that emits as a non-identity JSON property.
- `implicit-optional-patch-compliant`: both sides are clean when the transformed PATCH schema makes required source properties optional and omits a create-only source property.
- `multi-model-union-compliant`: both sides are clean for unsupported multi-model unions because Autorest emits no traversable PATCH schema properties.
- `never-property-compliant`: both sides are clean when Autorest omits a required `never`-typed property.
- `multipart-patch-body-compliant`: both sides are clean for required multipart parts emitted as `formData`, with independent ARM warnings recorded.
- `file-patch-body-compliant`: both sides are clean for a file payload emitted as a primitive binary body schema, with independent ARM warnings recorded.

An earlier review suggested treating `Lifecycle.Create` combined with non-emitted lifecycle members such as `Lifecycle.Delete` as create-only. A focused fixture showed that such a property is omitted from the PATCH schema and Swagger does not report it, so that suggestion was rejected to avoid a TypeSpec-only false positive.

## Remaining uncertainty

The production rule covers every observed validator project and all known authorable Swagger branches. Selected-version comparison no longer counts older or HTTP-unreachable declarations, and emitter-aligned payload filtering removes known AppLink- and Azure Resilience-style false alerts. Classification remains **partial** because the 12 remaining TypeSpec-only projects are not all path-by-path equivalent to emitted Swagger and because intentional falsy-default diagnostics exceed the validator's buggy truthiness behavior.
