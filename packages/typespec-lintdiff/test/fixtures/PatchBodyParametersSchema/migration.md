# PatchBodyParametersSchema migration evidence

## Conclusion

The migrated TypeSpec rule required production and comparison-harness updates. The production rule now covers the Swagger rule's authorable required, default, and create-only branches; traverses model variants inside unions, including nullable top-level PATCH bodies; preserves project-owned diagnostic targets while traversing imported library models; and mirrors Swagger's top-level emitted-JSON `identity` exception. It uses the same HTTP metadata visibility and optionality APIs as the Autorest emitter, so it checks only properties present in the effective PATCH schema and reports required properties according to their emitted PATCH optionality.

The corpus comparison now projects opted-in rules to the dataset-selected API version and keeps only diagnostics reachable from that version's HTTP operations. Raw TypeSpec diagnostics remain recorded for audit. This is comparison-only behavior: ordinary linting still reports diagnostics for every authored version.

The final full corpus run reports all 93 validator projects in the TypeSpec set, with no validator-only projects. TypeSpec-only projects fell from 51 to 12 after selected-version reachability and emitted PATCH schema filtering were applied. The rule remains **partial** because the remaining TypeSpec-only findings include intentional detection of falsy defaults that Swagger misses and other source-to-emission differences that have not all been classified path by path.

## Evidence provenance

- Validator report: `packages/typespec-lintdiff/specs/validator-results.json`, generated from azure-rest-api-specs commit `f6b53f105b95da05276530a0754a1c71b4f16397` by the dataset recorded in `packages/typespec-lintdiff/specs/_meta.json`.
- TypeSpec report: `packages/typespec-lintdiff/specs/typespec-results.json` and `comparison-results.json`, full run generated at `2026-08-24T08:08:01.918Z` from the same specs commit and this branch's review fixes documented below.
- Population: 468 source projects, 462 successful projects, and 6 compile failures. The full run took 2,506,210 ms.
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
  - `implicit-optional-patch-compliant` covers required and create-only source properties that are optional or omitted in a transformed PATCH schema;
  - `never-property-compliant` covers a required source property omitted because its type is `never`;
  - `default-patch-property` includes `false`, `0`, and `""` defaults to prove those valid TypeSpec findings are retained.

## Final corpus

The final full run used specs commit `f6b53f105b95da05276530a0754a1c71b4f16397` and was generated on `2026-08-24T08:08:01.918Z`.

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
- **Source:** `OptionalDiscriminator.kind` and `SynthesizedDiscriminator.kind`

```typespec
@discriminator("kind")
model OptionalDiscriminator {
  kind?: string;
}
@discriminator("kind")
model SynthesizedDiscriminator {}
```

```json
"OptionalDiscriminator": { "discriminator": "kind", "required": ["kind"] },
"SynthesizedDiscriminator": { "discriminator": "kind", "required": ["kind"] }
```

| Engine            | Observed result                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| Swagger validator | Two required-property diagnostics.                                                                 |
| TypeSpec lint     | Two matching diagnostics after mirroring Autorest's forced and synthesized discriminator behavior. |

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

| Engine            | Observed result                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| Swagger validator | Reports required properties inside nullable model references.                                               |
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

## Aligned project sets

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

## Compile failures

The full corpus run had six TypeSpec compile failures, excluded from the aligned behavioral comparison:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

No `PatchBodyParametersSchema` validator-only project is hidden by these failures.

## Fixture evidence

The repository's fixture harness validates eleven cases:

- `required-patch-property`: Swagger and TypeSpec report the required property.
- `nullable-body-required-property`: Swagger and TypeSpec report a required property in a nullable top-level PATCH body.
- `default-patch-property`: Swagger reports the truthy default; TypeSpec additionally reports `false`, `0`, and `""` defaults by design.
- `create-only-patch-property`: Swagger and TypeSpec report the create-only property.
- `nullable-model-required-property`: Swagger and TypeSpec report a required property inside a nullable model.
- `discriminator-required-patch-property`: Swagger and TypeSpec report both an authored optional discriminator and a discriminator synthesized by Autorest as required.
- `top-level-identity-compliant`: both sides are clean for the skipped top-level `identity` shape.
- `encoded-identity-compliant`: both sides are clean when an authored property emits as top-level JSON `identity`.
- `encoded-non-identity-violating`: Swagger and TypeSpec both check an authored `identity` property that emits as a non-identity JSON property.
- `implicit-optional-patch-compliant`: both sides are clean when the transformed PATCH schema makes required source properties optional and omits a create-only source property.
- `never-property-compliant`: both sides are clean when Autorest omits a required `never`-typed property.

An earlier review suggested treating `Lifecycle.Create` combined with non-emitted lifecycle members such as `Lifecycle.Delete` as create-only. A focused fixture showed that such a property is omitted from the PATCH schema and Swagger does not report it, so that suggestion was rejected to avoid a TypeSpec-only false positive.

## Remaining uncertainty

The production rule covers every observed validator project and all known authorable Swagger branches. Selected-version comparison no longer counts older or HTTP-unreachable declarations, and emitter-aligned payload filtering removes known AppLink- and Azure Resilience-style false alerts. Classification remains **partial** because the 12 remaining TypeSpec-only projects are not all path-by-path equivalent to emitted Swagger and because intentional falsy-default diagnostics exceed the validator's buggy truthiness behavior.
