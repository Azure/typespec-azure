# XmsResourceInPutResponse migration

## Conclusion

The migrated rule provides intentional defense-in-depth coverage for ARM authors who bypass the
standard resource operation templates. Standard ARM templates already enforce the rule structurally.
For manually authored PUT operations, the TypeSpec rule is functionally equivalent to the intended
Swagger behavior: it rejects resource-shaped 200/201 response models that have neither registered ARM
resource semantics nor an explicit `x-ms-azure-resource: true` extension.

A TypeSpec rule update was required. The previous implementation used `isAzureResource`, which checks
only whether the exact model is decorated as an ARM resource base. It therefore reported registered
`ProxyResource` and `ExtensionResource` instances. The rule now uses `getArmResource`, the ARM
library's registered-resource lookup, and includes a standard-template compliant regression fixture.

## Source behavior

- Validator source:
  `packages/rulesets/src/spectral/functions/with-xms-resource.ts` in
  `Azure/azure-openapi-validator`.
- Rule registration:
  `packages/rulesets/src/spectral/az-arm.ts` (`RPC-Put-V1-12`).
- The selector visits PUT operations under `paths` and `x-ms-paths`.
- `getReturnedSchema` selects the first schema under response `200`, then `201`.
- `isXmsResource` accepts `x-ms-azure-resource: true` on that schema or an inline `allOf` ancestor.
  It does not dereference external `$ref` ancestors.

The TypeSpec implementation visits namespace-level and interface operations in ARM provider
namespaces, including their child namespaces, by resolving provider ownership upward. It selects HTTP
PUT and checks the first model body for status 200 and then 201. A response is compliant when it is a
registered ARM resource or has an explicit extension in its base-model hierarchy. The diagnostic
targets the response model. Global operations are ignored even when an unrelated ARM provider
namespace exists elsewhere in the program.

## Existing TypeSpec coverage classification

**Partial:** standard ARM templates and base types emit the required extension, as recorded for
`RPC-Put-V1-12` in
`website/src/content/docs/docs/howtos/ARM/rpc-guidelines-coverage.md`. The local rule covers the
remaining manually authored operation shape, which requires bypassing the standard operation
templates. The enabled official `arm-resource-operation-response` rule validates resource schema
consistency, but does not reproduce this extension check for raw operations.

## Emission matrix

The relevant emitter branch is
`packages/typespec-autorest/src/openapi.ts`, where a model recognized by `isAzureResource` receives
`x-ms-azure-resource: true`. Explicit OpenAPI extensions are emitted by the normal model-extension
path.

| Authored TypeSpec shape                                                                    | Emitter/result                                                                    | Swagger                     | TypeSpec  | Fixture                                       |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | --------------------------- | --------- | --------------------------------------------- |
| Manual PUT returning resource-shaped model without ARM registration or extension           | Model schema has no `x-ms-azure-resource`                                         | violation                   | violation | `put-missing-azure-resource`                  |
| Manual interface PUT returning resource-shaped model without ARM registration or extension | Model schema has no `x-ms-azure-resource`                                         | violation                   | violation | `put-interface-missing-azure-resource`        |
| Manual PUT in a child provider namespace returning an unmarked resource-shaped model       | Model schema has no `x-ms-azure-resource`                                         | violation                   | violation | `put-nested-namespace-missing-azure-resource` |
| Manual PUT returning model with explicit `@extension("x-ms-azure-resource", true)`         | Model schema has the extension                                                    | compliant                   | compliant | `put-with-azure-resource`                     |
| Standard PUT returning registered `TrackedResource`                                        | Concrete schema inherits the marked common-types resource through external `$ref` | validator defect: violation | compliant | `put-arm-resource`                            |
| Manual PATCH returning resource-shaped model without extension                             | Schema lacks extension, but selector excludes PATCH                               | compliant                   | compliant | `patch-ignored`                               |
| Global PUT outside an ARM provider namespace                                               | Not emitted as an ARM service operation                                           | not applicable              | ignored   | `global-put-ignored`                          |

Response bodies without a model are ignored by both implementations. The rule deliberately limits
manual response candidates to models with inherited or direct `name` and `type` properties, avoiding
false positives on arbitrary PUT response bodies outside the ARM resource shape.

## Coverage report reconciliation

Both reports use different snapshots and coverage definitions; their percentages are not directly
comparable.

| Report                                                   | Population/revision                                                                                                   | Row                                                                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `packages/typespec-lintdiff/docs/coverage_old.md`        | External aggregate snapshot; no reconstructable per-project list                                                      | `lint`, validator fired in 391 projects, local lint credited in 2, official in 0, 0.5%               |
| `packages/typespec-lintdiff/specs/coverage-breakdown.md` | specs `f6b53f105b95da05276530a0754a1c71b4f16397`; generated 2026-08-10; 468 source projects, 462 successful, 6 failed | production lint; validator 13 projects/47 diagnostics, TypeSpec 3 projects/10 diagnostics, overlap 0 |

The checked-in validator shard was generated on 2026-08-06 and contains 155 raw occurrences in 14
projects; the later coverage report uses its aligned successful-project/filter population and retains
47 diagnostics in 13 projects. These are emitted OpenAPI occurrences, not TypeSpec source identities.

### Project sets before this fix

- **Overlap:** none.
- **TypeSpec-only:** `specification/apicenter/ApiCenter.Management`,
  `specification/management/resource-manager/Microsoft.Management/ManagementGroups`,
  `specification/resources/resource-manager/Microsoft.Authorization/policy`.
- **Validator-only:** Application Insights AnalyticsItems, ComponentAPIs, and Favorites; Automation;
  Compute; Confluent; Datadog; Guest Configuration Assignments; Key Vault; Recovery Services;
  Resources; SQL; and Web/AppService.
- **Compile failures:** six projects in the corpus. The checked-in breakdown marks no validator
  projects for this rule as unassessed, so they do not reduce this rule's assessable validator set.

The ten TypeSpec-only diagnostics all target registered `ProxyResource` or `ExtensionResource`
models. They are false positives caused by using the ARM base-marker API instead of the registered
resource lookup and are fixed here. The validator-only set reflects the Swagger helper's failure to
dereference external common-types ancestry; copying that emitted-reference defect would make the
semantic TypeSpec rule less correct.

### Post-fix full corpus

The full 468-project corpus completed on 2026-09-04 at specs commit
`f6b53f105b95da05276530a0754a1c71b4f16397`: 462 projects compiled and 6 failed.
The refreshed, selected-version row contains 13 validator projects and 47 validator diagnostics and
20 TypeSpec projects and 60 diagnostics. Nine projects overlap:

- `specification/automation/Automation.Management`
- `specification/compute/resource-manager/Microsoft.Compute/Compute/Compute`
- `specification/confluent/resource-manager/Microsoft.Confluent/Confluent`
- `specification/datadog/resource-manager/Microsoft.Datadog/Datadog`
- `specification/guestconfiguration/resource-manager/Microsoft.GuestConfiguration/Assignments`
- `specification/keyvault/resource-manager/Microsoft.KeyVault/KeyVault`
- `specification/recoveryservices/resource-manager/Microsoft.RecoveryServices/RecoveryServices`
- `specification/sql/resource-manager/Microsoft.Sql/SQL`
- `specification/web/resource-manager/Microsoft.Web/AppService`

The four validator-only projects are:

- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/AnalyticsItems`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/ComponentAPIs`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/Favorites`
- `specification/resources/resource-manager/Microsoft.Resources/resources`

The eleven TypeSpec-only projects are:

- `specification/advisor/resource-manager/Microsoft.Advisor/Advisor`
- `specification/apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement`
- `specification/appconfiguration/resource-manager/Microsoft.AppConfiguration/AppConfiguration`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/Components`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WebTestsApi`
- `specification/azure-kusto/resource-manager/Microsoft.Kusto/Kusto`
- `specification/containerinstance/resource-manager/Microsoft.ContainerInstance/ContainerInstance`
- `specification/frontdoor/resource-manager/Microsoft.Network/FrontDoor`
- `specification/operationalinsights/resource-manager/Microsoft.OperationalInsights/OperationalInsights`
- `specification/solutions/Solutions.Management`
- `specification/trafficmanager/resource-manager/Microsoft.Network/TrafficManager`

No validator project for this rule was unassessed. The corpus runner projects the rules in its
projected-rule set to each project's selected API version before creating this row, so these 60
TypeSpec diagnostics belong to the selected-version comparison rather than only to older versions.
The additional TypeSpec-only projects contain custom or legacy resource shapes not represented as
violations in the retained Swagger population; they are intentional defense-in-depth findings.

### Gap example: registered resource false positive

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** `specification/apicenter/ApiCenter.Management` / corpus-selected version
- **Source:** `MetadataSchema.tsp:14`

**TypeSpec source**

```typespec
@parentResource(Service)
model MetadataSchema is ProxyResource<MetadataSchemaProperties> {
  name: string;
}
```

**Emitted OpenAPI or validator behavior**

```json
{ "x-ms-azure-resource": true }
```

| Engine            | Observed result                                                                   |
| ----------------- | --------------------------------------------------------------------------------- |
| Swagger validator | No intended diagnostic because the ARM resource schema carries the extension      |
| TypeSpec lint     | Previously diagnosed the registered resource; now accepts it via `getArmResource` |

**Explanation:** `isAzureResource` marks only the exact ARM base model. `getArmResource` recognizes
the registered concrete resource that the emitter treats as an ARM resource.

**Disposition:** production rule fix and `put-arm-resource` regression fixture.

### Gap example: unresolved external `$ref` ancestry

- **Classification:** validator-only
- **Status:** intentional
- **Project/API version:** validator-only projects listed above / corpus-selected latest versions
- **Source:** emitted resource response schemas inheriting common-types resources

**TypeSpec source**

```typespec
model Widget is TrackedResource<WidgetProperties>;
```

**Emitted OpenAPI or validator behavior**

```json
{
  "allOf": [
    {
      "$ref": "../../../../../common-types/resource-management/v3/types.json#/definitions/TrackedResource"
    }
  ]
}
```

| Engine            | Observed result                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Swagger validator | Can report because `isXmsResource` recursively inspects objects but does not dereference `$ref` |
| TypeSpec lint     | Accepts the registered ARM resource                                                             |

**Explanation:** the validator's emitted-document lookup limitation is not an authorable semantic
violation. ARM templates and the emitter retain the intended resource semantics.

**Disposition:** intentional semantic correction; do not copy the validator defect.

### Gap example: explicitly unmarked legacy custom resource

- **Classification:** TypeSpec-only
- **Status:** intentional
- **Project/API version:** `specification/appconfiguration/resource-manager/Microsoft.AppConfiguration/AppConfiguration` / corpus-selected version
- **Source:** `Snapshot.tsp:22`

**TypeSpec source**

```typespec
@parentResource(ConfigurationStore)
model Snapshot is Azure.ResourceManager.Legacy.CustomAzureProxyResource<false> {
  properties: SnapshotProperties;
}
```

**Emitted OpenAPI or validator behavior**

```typespec
@customAzureResource(#{ isAzureResource: false })
model CustomAzureProxyResource extends Foundations.ProxyResource {}
```

| Engine            | Observed result                                                                   |
| ----------------- | --------------------------------------------------------------------------------- |
| Swagger validator | No diagnostic in the retained selected Swagger population                         |
| TypeSpec lint     | Diagnostic because the custom resource explicitly disables Azure-resource marking |

**Explanation:** `packages/typespec-autorest/src/openapi.ts` emits `x-ms-azure-resource` only when
the resource-base marker is present or custom-resource options set `isAzureResource: true`. The
authored `false` option therefore represents the exact missing semantic checked by this rule.

**Disposition:** intentional extra defense-in-depth coverage in converted TypeSpec.

## Diagnostic cardinality

Before this fix, the aligned report had 47 validator findings and 10 TypeSpec source findings. The
final selected-version row has 47 validator and 60 TypeSpec findings. The complete retained validator
shard contains 155 emitted occurrences: 137 unique project + Swagger file + JSON-path identities and
57 unique project + JSON-path identities. The complete TypeSpec shard contains 167 occurrences and
145 unique project + source file + line + column identities before selected-version projection.
The validator and TypeSpec identities describe different domains, so they are preserved rather than
presented as one-to-one equivalents.

## Required changes

- Use the ARM registered-resource lookup in
  `src/rules/xms-resource-in-put-response.ts`.
- Add a standard ARM resource/template compliant regression fixture.
- Refresh focused snapshots and rerun the full corpus (completed).

Functional equivalence concerns intended behavior, not raw count equality. Remaining validator-only
findings are known external-reference artifacts; final post-fix corpus counts are recorded after the
full rerun.
