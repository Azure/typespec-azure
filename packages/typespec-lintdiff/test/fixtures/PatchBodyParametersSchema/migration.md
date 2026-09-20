# PatchBodyParametersSchema migration evidence

## Result and gap summary

The September 18 full corpus completed: 462/468 projects compile, with **703 Swagger
diagnostics in 93 projects versus 769 selected-version TypeSpec diagnostics in 101 projects**.
Ninety projects overlap. The three Swagger-only projects have four diagnostics on excluded
Read/Create input or descendants of Read-only properties. Of eleven TypeSpec-only projects,
ten have 24 falsy defaults missed by the validator; ProgrammableConnectivity's six required
properties remain an unresolved source-to-recorded-Swagger attribution, not an older-version
explanation.

The repair now checks resolved PATCH input and authored discriminator optionality rather
than AutoRest schema sharing or synthesized/forced discriminators. Twenty-three emitter-free
native tests and eighteen comparison fixtures pass. This intentionally provides **partial
Swagger coverage**, not full functional equivalence. Six known compile failures and
unclassified differences within overlapping projects remain limitations. Corpus overlap
does not justify restoring emitter behavior or establish universal native-shape coverage.

## Scope and decision

This is an explicitly authorized post-merge source repair following merged PR
[#5480](https://github.com/Azure/typespec-azure/pull/5480), not a duplicate migration.
It addresses promotion review comments
[4037343644](https://github.com/Azure/typespec-azure/pull/5294#discussion_r4037343644) and
[4037402479](https://github.com/Azure/typespec-azure/pull/5294#discussion_r4037402479).
The new branch starts at `e5ad7b749fad60e4b2d78634897cc8cad211e8c2`.
Prior source `bbd50fc21b5c7fe3b7bcf57084e410ba17d6ea6b` is unchanged.

**TypeSpec rule update required and implemented:** use resolved request visibility for
membership and optionality; remove canonical Read sharing and discriminator synthesis/forcing.
Use `walkPropertiesInherited` rather than a local property walker; cache HTTP metadata per
rule instance and retain fresh traversal state per operation. Describe create-only visibility
using TypeSpec wording rather than `x-ms-mutability`.

The enabled official `arm-resource-patch` implementation checks body shape, tags and
resource-property subsets, not this rule's required/default/create-only checks. Although
`rpc-guidelines-coverage.md` labels RPC-Patch-V1-10 covered, that prose overstates the
implementation. ARM templates optionalize standard update models but do not prevent valid
independently authored PATCH bodies. The proposed defect is an uncovered native semantic
gap. The source's mixed-ruleset provider isolation remains unchanged; removing that guard
in the official ARM copy remains a promotion-specific adaptation.

## Native contract and upstream evidence

- [Validator implementation](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/functions/patch-body-parameters.ts)
- [Validator tests](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/test/patch-body-parameters.test.ts)
- [Validator documentation](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/docs/patch-body-parameters-schema.md)
- Installed fixture validator: `@microsoft.azure/openapi-validator-rulesets` 2.2.5.
- Compiler/HTTP source: core gitlink `a6137cac43a727ce0c2656364fd72d50c272ee4a`.
- Native implementation: `src/rules/patch-body-parameters-schema.ts`.
- Native regressions: `test/rules/patch-body-parameters-schema.test.ts`.
- [Rule-local native shape/emission matrix](./rule.md#native-shape-and-emission-matrix).

The upstream selector checks PATCH `in: body` parameters with schemas. It resolves object
properties and required lists through inheritance, skips only top-level case-insensitive
`identity`, checks truthy defaults, required membership and exact `["create"]` mutability,
then recursively checks nested objects. Diagnostics target the selected schema path.
Upstream tests prove direct/inherited defaults and required/create-only fields, nested
defaults, compliant optional properties, and the top-level versus nested identity boundary.

The native rule inspects HTTP `single` body models and nullable single-model unions.
Resolved request visibility comes from `resolveRequestVisibility`; the same visibility is
passed to `MetadataInfo.isPayloadProperty` and `isOptional`. Excluded properties are never
checked or traversed. A request-visibility override can expose a create-only property;
ordinary Update visibility cannot. No emitter or OpenAPI APIs participate in decisions.
The encoded top-level identity exemption, inherited override handling, recursive protection,
`never` exclusion, imported-property diagnostic fallback and all falsy defaults are retained.
No array/indexer or multi-model-union traversal was added.

### Compiler discriminator boundary

Compiler `validateInheritanceDiscriminatedUnions` calls
`getDiscriminatedUnionFromInheritance`, whose validation walks **derived variants**.
An absent or optional discriminator on a root model is valid TypeSpec. A derived leaf
without a discriminator is rejected as `missing-discriminator-property`; an authored
optional derived discriminator is rejected as `invalid-discriminator-value`.
The native rule does not duplicate either compiler check.

The tests use valid inherited hierarchies with a concrete descendant, rather than suppressing
compiler errors to construct invalid variants. Required inherited properties are diagnosed
once at their authored target; excluded inherited discriminators are ignored. Legacy
implicit-optional tests suppress only HTTP's deprecation warning, following the existing
official tests; this does not suppress discriminator validation or make an invalid shape valid.

## Report reconciliation

Both reports were read before implementation:

| Report                                                   | Population and meaning                                                                       | Rule row before this repair                                                                                  |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `docs/coverage_old.md`                                   | 450 compiled projects, 210 rules; migration disposition including official/structural credit | Partial, 87 validator projects, 85 local, 0 official, 97.7%; raw totals and unmatched identities unavailable |
| `specs/coverage-breakdown.md` at the fetched source base | 462/468 projects, 215 rules; production same-project overlap only                            | 93 validator, 128 TypeSpec, 89 overlap, 4 validator-only, 39 TypeSpec-only; 703/1,230 diagnostics            |
| September 15 repair note (historical)                    | Same pinned specs, full run after payload-kind repair                                        | 93/105 projects, 93 overlap, 0 validator-only, 12 TypeSpec-only; 703/872 diagnostics                         |
| September 18 native repair                               | Same pinned specs, full run; 462/468 successfully compile                                    | 93/101 projects, 90 overlap, 3 validator-only, 11 TypeSpec-only; 703/769 diagnostics                         |

The old external report records no reconstructible per-project detail or spec/generator SHA.
Its checked-in snapshot came from commit `6a418911dbe5d35992fb5845cf4460d45643fec8`
(August 11); the base coverage file last changed in
`bf4e84189edc4ebcfcd2fc6ef881e74e3f485ece` (August 10). These are repository
provenance, not invented report generation revisions. The base corpus report is stale relative
to the September source repairs. Different project denominators and definitions preclude
identifying external-report missing projects by subtraction.

### Current corpus

This is the full, unfiltered 468-project corpus at `Azure/azure-rest-api-specs`
commit `f6b53f105b95da05276530a0754a1c71b4f16397`, using compiler 1.14.0 and
the existing runner at concurrency six. The isolated specs checkout remained pinned.

The run exited zero after 1,429,808 ms (about 24 minutes); report generation time is
`2026-09-18T09:35:11.092Z`. Zero runner exit does not mean every project compiled.

| Population / identity                                                   |         Count |
| ----------------------------------------------------------------------- | ------------: |
| Source / successful / failed projects                                   | 468 / 462 / 6 |
| Validator projects / diagnostics, successful population                 |      93 / 703 |
| Selected-version TypeSpec projects / diagnostics, successful population |     101 / 769 |
| Overlap / validator-only / TypeSpec-only projects                       |   90 / 3 / 11 |
| Raw TypeSpec diagnostics, all projects including failures               |           787 |
| Raw TypeSpec diagnostics, successful projects                           |           779 |
| Selected-version TypeSpec diagnostics, all projects including failures  |           777 |
| Validator project + Swagger file + JSON path identities                 |           276 |
| Validator project + JSON path identities                                |           276 |
| TypeSpec project + source file + line + column identities               |           613 |
| TypeSpec diagnostics without source locations                           |             0 |

Independent shard aggregation agrees with the runner's 703/769 totals. The ten-diagnostic
reduction from 779 raw successful-project diagnostics to 769 uses the existing selected-version
HTTP-reachability filter; it is not production suppression. The additional eight diagnostics
in failed projects are excluded from both engines' behavioral population.

Path-only identities intentionally collapse different property messages reported at the same
schema node, while source identities collapse reused declaration targets. They are not a
cross-engine canonical identity. Among the 104 projects in the union, raw counts are equal
in 51, validator-higher in 15 (74 excess occurrences), and TypeSpec-higher in 38 (140 excess
occurrences): net +66 native diagnostics. No equality of these identities proves equivalence.

### Complete one-sided project sets

Each row below was inspected against the pinned source, selected API version and retained
Swagger. All eleven native-only projects' reported targets survive the runner's selected-version
projection. In particular, ApiCenter `restore` was added in March 2024 and exists in the
selected June version; Oracle's three DNS flags were added in July 2025 and exist in September;
ProgrammableConnectivity's six members are added/made required in the selected March 2025
version. None of these retained findings is explained away as older-version-only.

| Validator-only project                                                                              | Selected version   | Count | Source-backed cause                                                                                                                |
| --------------------------------------------------------------------------------------------------- | ------------------ | ----: | ---------------------------------------------------------------------------------------------------------------------------------- |
| `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/AccessReview`   | 2021-12-01-preview |     2 | `AccessReviewDecisionProperties.principal` and `.resource` are Read-only; their nested required `type` members are not PATCH input |
| `specification/confidentialledger/resource-manager/Microsoft.ConfidentialLedger/ConfidentialLedger` | 2026-05-22-preview |     1 | PATCH reuses `ConfidentialLedger`; inherited tracked-resource `location` has Read/Create visibility, not Update                    |
| `specification/workloads/Workloads.SAPDiscoverySite.Management`                                     | 2023-10-01-preview |     1 | `ServerInstanceProperties.performanceData` is Read-only; its required `dataSource` discriminator is excluded with its parent       |

| TypeSpec-only project                                                                                         | Selected version   | Count | Inspected targets / disposition                                                                       |
| ------------------------------------------------------------------------------------------------------------- | ------------------ | ----: | ----------------------------------------------------------------------------------------------------- |
| `specification/apicenter/ApiCenter.Management`                                                                | 2024-06-01-preview |     1 | `models.tsp:240`, `restore = false`                                                                   |
| `specification/azuredatatransfer/resource-manager/Microsoft.AzureDataTransfer/AzureDataTransfer`              | 2026-02-06-preview |     2 | `models.flowprofile.tsp:217,253`, archive minimum and data-size minimum `= 0`                         |
| `specification/billingbenefits/resource-manager/Microsoft.BillingBenefits/BillingBenefits`                    | 2026-06-01         |     3 | `models.tsp:1307,1428,2512`, two `renew` defaults and `allowContributors = false`                     |
| `specification/computeschedule/resource-manager/Microsoft.ComputeSchedule/ComputeSchedule`                    | 2026-04-15-preview |     1 | `scheduledactionmodels.tsp:168`, `disabled = false`                                                   |
| `specification/discovery/Discovery.Management`                                                                | 2026-06-01         |     1 | `../Discovery.Supercomputer.Management/nodePool.tsp:106`, `minNodeCount = 0`                          |
| `specification/imagebuilder/resource-manager/Microsoft.VirtualMachineImages/ImageBuilder`                     | 2025-10-01         |     3 | `models.tsp:652,660,690`, two empty VM-size strings and disk size `= 0`                               |
| `specification/kubernetesconfiguration/resource-manager/Microsoft.KubernetesConfiguration/fluxConfigurations` | 2025-04-01         |     2 | `models.tsp:1299,1305`, `insecure` and `useWorkloadIdentity = false`                                  |
| `specification/oracle/resource-manager/Oracle.Database/OracleDatabase`                                        | 2025-09-01         |     6 | `models/common.tsp:147,150,153` and `models/anchors/networkAnchor.tsp:55,60,65`, six `false` defaults |
| `specification/postgresql/DBforPostgreSQL.Management`                                                         | 2026-04-01-preview |     3 | `models.tsp:3328,3434,3517`, cluster size `= 0` and two empty availability-zone strings               |
| `specification/programmableconnectivity/ProgrammableConnectivity.Management`                                  | 2025-03-30-preview |     6 | `Gateway.tsp:167,173,185,191,197,204`; unresolved attribution described below                         |
| `specification/reservations/resource-manager/Microsoft.Capacity/Reservations/Reservations`                    | 2022-11-01         |     2 | `models.tsp:1444,2169`, `renew = false`                                                               |

### Count outliers and remaining uncertainty

| Project            | Swagger / native | Schema paths / source locations | Observed evidence                                                                                                                                                                  |
| ------------------ | ---------------: | ------------------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQL                |          42 / 13 |                          15 / 7 | Swagger includes many Create-only restore/source fields; native excludes them. Native `sku.name` repeats six times at one declaration                                              |
| NotificationHubs   |          41 / 56 |                          4 / 29 | Credential fields appear under both direct credentials and `pnsCredentials`; source targets repeat across operations. Multiple property diagnostics share each Swagger schema path |
| DomainRegistration |           15 / 1 |                           1 / 1 | Fifteen Swagger property diagnostics collapse onto one body schema; full per-property correspondence remains unclassified                                                          |
| ServiceFabric      |          15 / 28 |                          3 / 25 | Different schema-path and declaration populations; full per-property correspondence remains unclassified                                                                           |
| AppService         |          19 / 31 |                          7 / 13 | Reused source locations and multiple schema targets; full per-property correspondence remains unclassified                                                                         |
| EventGrid          |          62 / 51 |                         38 / 16 | Many emitted occurrences share source targets; full per-property correspondence remains unclassified                                                                               |

These observations describe actual multiplicity, not an inferred normalization that cancels
all differences. The SQL and NotificationHubs message groups were inspected, but the full
positive/negative remainder within overlapping projects has not been proven equivalent.

### Compile failures

These six projects match the preceding repair's known failure set and are excluded from
aligned comparison; none is hidden or counted as compliant:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

The specs input remains `f6b53f105b95da05276530a0754a1c71b4f16397`. Dataset metadata
was generated August 6 with 468 ARM projects and 625 emitted Swagger files. Swagger is the
dataset-selected latest API version; readme suppressions were not applied. The existing
`specs:typespec` runner executes all local rules with concurrency six, no filter or limit.
A representative `ApiCenter.Management` smoke run passed first (one project, 99 total
diagnostics across rules). Only successfully compiled projects enter the behavioral comparison.

The rule retains `projectionScope: http-reachable`: comparison projects to the selected
service API version and retains reachable diagnostics; ordinary source linting still sees
all authored versions. Raw totals remain separate. Generated corpus files are validation
artifacts and must not be committed.

## Code-backed gap examples

### Gap example: selected-version property reachability is not exact PATCH attribution

- **Classification:** TypeSpec-only
- **Status:** unresolved, pre-existing in the September 15 one-sided project list
- **Project/API version:** `ProgrammableConnectivity.Management` / `2025-03-30-preview`
- **Source:** `Gateway.tsp`, `ApplicationProperties` and `Gateways.update`

```typespec
@TypeSpec.Versioning.madeRequired(Versions.v2025_03_30_preview)
name: string;
// The selected service operation:
update is ArmTagsPatchSync<Gateway>;
```

The selected recorded Swagger PATCH body references `GatewayTagsUpdate`, containing only
optional `tags`; the six required `ApplicationProperties` members exist elsewhere in the same
selected Swagger document. Native diagnostics target those six source members through
`properties.configuredApplication`.

```json
{
  "GatewayTagsUpdate": {
    "properties": { "tags": { "type": "object", "additionalProperties": { "type": "string" } } }
  }
}
```

| Engine          | Observed result                                                                  |
| --------------- | -------------------------------------------------------------------------------- |
| Swagger         | Zero: the selected PATCH body is tags-only                                       |
| Native TypeSpec | Six required-property diagnostics retained by selected-version HTTP reachability |

**Disposition:** Preserve and disclose the unresolved operation/source-to-recorded-emission
attribution. The properties exist in the selected version, so simply labeling these as
older-version diagnostics is incorrect. This repair does not change template/operation
traversal or the comparison harness to erase the discrepancy.

### Gap example: schema sharing is not native PATCH membership

- **Classification:** validator-only
- **Status:** intentional after native repair
- **Project/API version:** `native-visibility-compliant`, unversioned fixture
- **Source:** `PatchBody`, `AugmentedPatchBody`, `DefaultPatchBody`

```typespec
model PatchBody {
  @visibility(Lifecycle.Read) id: string;
  @visibility(Lifecycle.Create) createdBy?: string;
  name?: string;
}
model AugmentedPatchBody {
  ...PatchBody;
  @visibility(Lifecycle.Read, Lifecycle.Query) unrelated?: string;
}
```

AutoRest's `canSharePropertyUsingReadonlyOrXMSMutability` retains the Read/Create fields
in the first schema. Adding the Read/Query property makes it select a transformed schema:

```json
{
  "PatchBody": {
    "properties": {
      "id": { "type": "string", "readOnly": true },
      "createdBy": { "type": "string", "x-ms-mutability": ["create"] },
      "name": { "type": "string" }
    },
    "required": ["id"]
  },
  "AugmentedPatchBody": { "properties": { "name": { "type": "string" } } }
}
```

| Engine          | Observed result                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger         | Two warnings on `PatchBody`, none on `AugmentedPatchBody`; two additional warnings for the read-only required/default `DefaultPatchBody.id` |
| Native TypeSpec | Zero for all three; each effective input contains only optional `name`                                                                      |

**Disposition:** Intentionally reject emitter schema sharing as a native membership rule.
The older `create-only-patch-property` fixture likewise retains its one Swagger warning but
expects no native warning. `create-visibility-override` separately proves that explicit
Create request visibility still diagnoses an actual create-only input. That fixture records
four Swagger warnings (shared-schema `id` required/default, `name` required, and `createdBy`
create-only) versus one native warning on `createdBy`; excluded Read/Update fields are not
Create request input.

### Gap example: emitted discriminator synthesis and requiredness

- **Classification:** validator-only
- **Status:** intentional after native repair
- **Project/API version:** `native-discriminator-compliant`, unversioned fixture
- **Source:** `AbsentDiscriminator`, `OptionalDiscriminator`, `ExcludedDiscriminator`

```typespec
@discriminator("kind")
model AbsentDiscriminator {}
@discriminator("kind")
model OptionalDiscriminator {
  kind?: string;
}
@discriminator("kind")
model ExcludedDiscriminator {
  @visibility(Lifecycle.Read) kind: string;
  name?: string;
}
```

AutoRest's model emission inserts or forces `kind` into `required` in each definition:

```json
{ "discriminator": "kind", "required": ["kind"] }
```

| Engine          | Observed result                                                       |
| --------------- | --------------------------------------------------------------------- |
| Swagger         | Three required-property warnings                                      |
| Native TypeSpec | Zero: absent, optional, and excluded are not required effective input |

**Disposition:** Remove synthesis/forcing, not compiler checks. The original mixed
`discriminator-required-patch-property` fixture keeps three Swagger warnings but only one
native warning, on the genuinely required `inheritedDiscriminator.kind`.
The native suite also proves root required, valid inherited required/excluded, and legacy
implicit optionality. Ambient no-string-discriminator/no-empty-model guidance remains
visible in comparison fixtures; it is not a compiler-error suppression.

### Gap example: falsy defaults

- **Classification:** TypeSpec-only
- **Status:** intentional, unchanged
- **Project/API version:** `default-patch-property` / `2024-01-01`
- **Source:** `WidgetPatchProperties.enabled`, `count`, `label`

```typespec
enabled?: boolean = false;
count?: int32 = 0;
label?: string = "";
```

```json
{ "enabled": { "default": false }, "count": { "default": 0 }, "label": { "default": "" } }
```

| Engine          | Observed result                                                              |
| --------------- | ---------------------------------------------------------------------------- |
| Swagger         | No warnings for these three values because `default` is tested by truthiness |
| Native TypeSpec | Three warnings because each authored effective-input default is defined      |

**Disposition:** Preserve the guideline rather than copy the validator bug. ApiCenter's
`ServiceUpdateProperties.restore` with default `false` is a corpus example, inspected in
the historical analysis and retained by the current representative run.

### Gap example: transport payloads are not PATCH documents

- **Classification:** historical TypeSpec-only false positives
- **Status:** fixed by the preceding payload-kind repair, retained here
- **Project/API version:** multipart/file comparison fixtures, unversioned
- **Source:** required multipart fields and `File.contents`

```typespec
@multipartBody body: { name: HttpPart<string>; contents: HttpPart<bytes>; }
```

AutoRest emits required `in: formData` parameters for multipart fields and a primitive
`{ "type": "string", "format": "binary" }` schema for a file body. Neither exposes object
properties selected by this Swagger rule. The native rule uses `bodyKind === "single"`;
both engines remain clean. Native model/tuple multipart, file, binary and nullable-model
controls pass. This does not approve non-JSON payloads under other ARM rules.

## Validation and limitations

The native suite passes 23 tests. Focused comparison passes all 18 cases: seven violating
cases with partial coverage, eight validator-clean compliance cases with reviewed ambient
warnings, and three reviewed validator discrepancies. Build and changed-file oxlint pass.
Only explicit maintained files are formatted; harness snapshots retain serializer formatting.
The existing catalog-wide `audit:noise` has no rule selector; the focused harness's complete
ambient diagnostics provide this rule's noise evidence rather than auditing unrelated rules.

One native draft correction added suppression of the supported legacy-option deprecation
warning (four initial failures, nineteen passes). One fixture draft correction refreshed
the pre-existing target branch's `patch-properties-correspond-to-put-properties` ambient
warning expectations in five rule-local cases. No other rule, validator, emitter, or harness
implementation changed. A third correction fixed a read-only analysis script's schema
assertion: comparison `projectCount` is 462 successful projects, while `sourceProjectCount`
and the execution index contain all 468. The complete corpus itself passed on its first
full invocation and was not rerun. All original failures remain in execution artifacts.

The historical payload-kind repair's clean corpus overlap did not establish native semantic
equivalence. This repair intentionally breaks emitted parity for the code-backed cases above.
Remaining unclassified corpus differences must be reported, never hidden to imply parity.
