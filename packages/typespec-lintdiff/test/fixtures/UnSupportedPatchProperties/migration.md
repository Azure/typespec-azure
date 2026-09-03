# UnSupportedPatchProperties migration

## Conclusion

The migrated `tsp-lintdiff-local-linter/unsupported-patch-properties` rule is
functionally equivalent to the intended `UnSupportedPatchProperties` Swagger
rule. It checks every PATCH operation in an ARM provider namespace for writable
top-level `id`, `name`, `type`, and `location` properties and writable
`properties.provisioningState`. It honors emitted JSON names, inheritance,
nullable model bodies, request visibility, `readOnly`, and `x-ms-mutability`.

The TypeSpec rule required an update. The previous implementation only checked
`id`, `name`, and `type` on registered ARM lifecycle updates. The production
rule was then found to use descendant namespace search for ARM scoping, which
missed operations nested below a provider namespace and could classify a global
operation from an unrelated ARM service. The repaired rule uses upward provider
ownership lookup instead. No emitter, validator, or comparison-harness change
is required.

Functional equivalence does not mean raw diagnostic equality. The remaining
validator-only results are verified false positives caused by Spectral
resolution dropping annotations beside `$ref`; the TypeSpec rule intentionally
does not reproduce that validator defect.

## Required changes

- Use `getArmProviderNamespace` to scope operations through namespace ownership
  rather than searching descendants with `resolveProviderNamespace`.
- Add a violating nested-provider-namespace fixture and a compliant global
  operation fixture alongside the existing direct semantic fixtures.

## Official coverage

Classification: **gap**.

The official ARM `arm-resource-patch` rule rejects PATCH fields absent from the
resource, but permits resource-envelope fields such as `name`, `type`, and
`location`. Custom ARM PATCH templates also accept arbitrary patch models. No
official rule implements the `RPC-Patch-V1-02` checks represented by
`UnSupportedPatchProperties`.

## Report reconciliation

| Report                                                                           | Population and revision                                                                                                                                                                             | Rule row                                                                                                            |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [`docs/coverage_old.md`](../../../docs/coverage_old.md)                          | Historical external snapshot; 450 compiled projects and 210 validator rules. The snapshot records its gist URL but not a spec or generator revision.                                                | 42 validator projects, 7 local-lint projects, 0 official projects, 16.7%                                            |
| Checked-in [`specs/coverage-breakdown.md`](../../../specs/coverage-breakdown.md) | Specs `f6b53f105b95da05276530a0754a1c71b4f16397`; 468 attempted, 462 assessed, 6 failed.                                                                                                            | production/lint; 45 validator, 24 TypeSpec, 7 overlap, 38 validator-only, 17 TypeSpec-only; 107/131 raw diagnostics |
| Reproduced migration run                                                         | Same specs commit; generated `2026-09-03T07:33:12.381Z`; duration 3,157,792 ms; current lintdiff generator on this branch. Generated corpus artifacts were validation output and are not committed. | production/lint; 45 validator, 21 TypeSpec, 21 overlap, 24 validator-only, 0 TypeSpec-only; 107/59 raw diagnostics  |

The historical 42/7 row and reproduced 45/21 row are not directly subtractable.
They use different snapshots and populations, and the historical report credits
mapping coverage while the lintdiff report requires observed same-project
diagnostics. The linked checked-in report shows 45 validator,
24 TypeSpec, 7 overlap, 38 validator-only, 17 TypeSpec-only, and 107/131 raw
diagnostics. Re-running the documented corpus at the same pinned commit with
the corrected semantics and latest-version projection produced the final
45/21/21/24/0 and 107/59 row.

The reproduced row is obtained with:

```powershell
mise exec -- pnpm --dir packages/typespec-lintdiff specs:typespec --specs-repo "C:\dev\worktrees\azure-rest-api-specs-lintdiff-un-supported-patch-properties" --concurrency 6
```

The comparison used the ARM ruleset, AutoRest/Spectral with resolved references,
no readme suppressions, and the latest Swagger API version. TypeSpec programs
were projected to that selected version and restricted to HTTP-reachable
declarations. Projects that failed TypeSpec compilation were excluded from both
sides of the behavioral comparison.

## Aligned project sets

**Overlap (21):**

- `specification/automation/Automation.Management`
- `specification/azure-kusto/resource-manager/Microsoft.Kusto/Kusto`
- `specification/botservice/resource-manager/Microsoft.BotService/BotService`
- `specification/containerinstance/resource-manager/Microsoft.ContainerInstance/ContainerInstance`
- `specification/containerregistry/resource-manager/Microsoft.ContainerRegistry/RegistryTasks`
- `specification/cosmos-db/resource-manager/Microsoft.DocumentDB/DocumentDB`
- `specification/devopsinfrastructure/resource-manager/Microsoft.DevOpsInfrastructure/DevOpsInfrastructure`
- `specification/extendedlocation/resource-manager/Microsoft.ExtendedLocation/CustomLocations`
- `specification/keyvault/resource-manager/Microsoft.KeyVault/KeyVault`
- `specification/maintenance/resource-manager/Microsoft.Maintenance/Maintenance`
- `specification/migrate/resource-manager/Microsoft.OffAzure/OffAzure`
- `specification/netapp/resource-manager/Microsoft.NetApp/NetApp`
- `specification/notificationhubs/resource-manager/Microsoft.NotificationHubs/NotificationHubs`
- `specification/paloaltonetworks/resource-manager/PaloAltoNetworks.Cloudngfw/Cloudngfw`
- `specification/recoveryservices/resource-manager/Microsoft.RecoveryServices/RecoveryServices`
- `specification/redhatopenshift/resource-manager/Microsoft.RedHatOpenShift/OpenShiftClusters`
- `specification/resources/resource-manager/Microsoft.Authorization/policy`
- `specification/resources/resource-manager/Microsoft.Resources/resources`
- `specification/servicebus/resource-manager/Microsoft.ServiceBus/ServiceBus`
- `specification/solutions/Solutions.Management`
- `specification/trafficmanager/resource-manager/Microsoft.Network/TrafficManager`

**Validator-only (24):**

- `specification/app/resource-manager/Microsoft.App/ContainerApps`
- `specification/batch/resource-manager/Microsoft.Batch/Batch`
- `specification/billing/resource-manager/Microsoft.Billing/Billing`
- `specification/certificateregistration/resource-manager/Microsoft.CertificateRegistration/CertificateRegistration`
- `specification/datamigration/resource-manager/Microsoft.DataMigration/DataMigration`
- `specification/domainregistration/resource-manager/Microsoft.DomainRegistration/DomainRegistration`
- `specification/dynatrace/resource-manager/Dynatrace.Observability/DynatraceObservability`
- `specification/elastic/resource-manager/Microsoft.Elastic/Elastic`
- `specification/eventhub/resource-manager/Microsoft.EventHub/Eventhub`
- `specification/help/resource-manager/Microsoft.Help/Help`
- `specification/machinelearningservices/MachineLearningServices.Management`
- `specification/management/resource-manager/Microsoft.Management/ServiceGroups`
- `specification/newrelic/NewRelicObservability.Management`
- `specification/operationalinsights/resource-manager/Microsoft.OperationalInsights/OperationalInsights`
- `specification/purview/resource-manager/Microsoft.Purview/Purview`
- `specification/recoveryservicesbackup/resource-manager/Microsoft.RecoveryServices/RecoveryServicesBackup`
- `specification/redisenterprise/resource-manager/Microsoft.Cache/RedisEnterprise`
- `specification/search/resource-manager/Microsoft.Search/Search`
- `specification/security/resource-manager/Microsoft.Security/Security/SecurityConnectorsDevOpsAPI`
- `specification/signalr/resource-manager/Microsoft.SignalRService/SignalRService`
- `specification/sql/resource-manager/Microsoft.Sql/SQL`
- `specification/storagecache/resource-manager/Microsoft.StorageCache/StorageCache`
- `specification/web/resource-manager/Microsoft.Web/AppService`
- `specification/webpubsub/resource-manager/Microsoft.SignalRService/SignalRService`

There are no TypeSpec-only projects. Every validator-only emitted property was
audited: 38 `provisioningState` occurrences had `$ref` plus `readOnly: true`,
and two `location` occurrences had `$ref` plus
`x-ms-mutability: ["read", "create"]`. None was writable.

**Excluded compile failures (6):**

- DeviceProvisioningServices: duplicate-body diagnostics.
- TenantActionGroups: missing route reference parameters.
- Network: TypeSpec compilation failure. Its raw shards contained three
  validator and two TypeSpec findings, all excluded.
- Quota: missing route reference parameters.
- Resources deployments: duplicate-body diagnostic.
- ServiceLinker: duplicate-body diagnostics.

## Diagnostic cardinality

| Identity                                                                         | Validator | TypeSpec |
| -------------------------------------------------------------------------------- | --------: | -------: |
| Raw selected-version diagnostics                                                 |       107 |       59 |
| Validator project + file + JSON path / TypeSpec project + source + line + column |        96 |       52 |
| Validator project + JSON path                                                    |        96 |      N/A |

These identities are intentionally not forced into a synthetic one-to-one
mapping. Swagger reports emitted occurrences, while TypeSpec reports semantic
source targets that can be reused across operations, versions, and schemas.
The material one-sided project outliers all belong to the same `$ref`
annotation-loss category described below.

## Fixture evidence

The eight fixtures exercise direct reserved properties, nullable bodies, nested
provisioning state, inherited and encoded names, read-only and immutable
properties, referenced read-only properties, scalars, multi-model unions,
nested ARM provider namespaces, and global operations beside an ARM service.
Focused validation covers all four violating fixtures and all four compliant
fixtures. No unreviewed fixture noise remains.

### Gap example: missing location and provisioning-state checks

- **Classification:** validator-only
- **Status:** fixed
- **Project/API version:** focused fixture / `2024-01-01`
- **Source:** `patch-with-location-provisioning-state/main.tsp`

**TypeSpec source**

```typespec
model WidgetPatch {
  location?: string;
  properties?: WidgetPatchProperties;
}
model WidgetPatchProperties {
  provisioningState?: ResourceProvisioningState;
}
@body body: WidgetPatch | null
```

**Emitted OpenAPI or validator behavior**

```json
{
  "location": { "type": "string" },
  "properties": { "$ref": "#/definitions/WidgetPatchProperties" }
}
```

| Engine            | Observed result                                               |
| ----------------- | ------------------------------------------------------------- |
| Swagger validator | Diagnostics for `location` and `properties.provisioningState` |
| TypeSpec lint     | Matching diagnostics on both authored properties              |

**Explanation:** The original migration checked only `id`, `name`, and `type`
on registered lifecycle updates. Operation traversal plus the complete reserved
property set closes the semantic gap, including nullable request bodies.

**Disposition:** Production rule and fixtures updated.

### Gap example: nested provider namespace was not inherited

- **Classification:** validator-only
- **Status:** fixed
- **Project/API version:** focused fixture / unversioned
- **Source:** `nested-arm-namespace/main.tsp`

**TypeSpec source**

```typespec
@armProviderNamespace
@service(#{ title: "Test Service" })
namespace Microsoft.TestService {
  namespace Nested {
    model WidgetPatch {
      id?: string;
    }

    @patch
    op update(@body body: WidgetPatch): void;
  }
}
```

**Emitted OpenAPI or validator behavior**

```json
{
  "definitions": {
    "Nested.WidgetPatch": {
      "properties": {
        "id": { "type": "string" }
      }
    }
  }
}
```

| Engine            | Observed result                                      |
| ----------------- | ---------------------------------------------------- |
| Swagger validator | Diagnostic for writable top-level `id`               |
| TypeSpec lint     | Matching diagnostic after upward provider resolution |

**Explanation:** The operation belongs to the decorated parent provider
namespace. Descendant search starting from `Nested` could not find that parent,
while `getArmProviderNamespace` follows the ownership chain upward.

**Disposition:** Production namespace scoping and direct fixture fixed.

### Gap example: unrelated global operation inherited a child provider

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** focused fixture / unversioned
- **Source:** `global-operation-compliant/main.tsp`

**TypeSpec source**

```typespec
@armProviderNamespace
@service(#{ title: "Test Service" })
namespace Microsoft.TestService {

}

model WidgetPatch {
  id?: string;
}

@patch
op update(@body body: WidgetPatch): void;
```

**Emitted OpenAPI or validator behavior**

```json
{
  "paths": {},
  "definitions": {}
}
```

| Engine            | Observed result                                                |
| ----------------- | -------------------------------------------------------------- |
| Swagger validator | No diagnostic; the global operation is outside the ARM service |
| TypeSpec lint     | No diagnostic after requiring an owning provider namespace     |

**Explanation:** Searching downward from the global namespace found the
separate `Microsoft.TestService` provider and incorrectly treated the global
operation as ARM-owned. An undefined operation namespace now exits before
provider lookup.

**Disposition:** Production namespace scoping and compliant fixture fixed.

### Gap example: resolved `$ref` loses read-only annotation

- **Classification:** validator-only
- **Status:** intentional
- **Project/API version:** focused fixture; representative of all 24
  validator-only corpus projects / `2024-01-01`
- **Source:** `readonly-ref-validator-discrepancy/main.tsp`

**TypeSpec source**

```typespec
model WidgetPatchProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}
```

**Emitted OpenAPI or validator behavior**

```json
{
  "provisioningState": {
    "$ref": "#/definitions/Azure.ResourceManager.ResourceProvisioningState",
    "readOnly": true
  }
}
```

| Engine            | Observed result                                                                   |
| ----------------- | --------------------------------------------------------------------------------- |
| Swagger validator | False-positive diagnostic after resolved-path processing drops the `$ref` sibling |
| TypeSpec lint     | No diagnostic because the property is read-only                                   |

**Explanation:** The validator rule executes with `resolved: true`. Spectral's
resolved property no longer retains the sibling `readOnly` (and similarly can
lose `x-ms-mutability`), so the validator mistakes an exempt field for a
writable field.

**Disposition:** Preserve intended semantics; do not reproduce the validator
defect.

### Gap example: latest-version projection

- **Classification:** count-only
- **Status:** population mismatch
- **Project/API version:** NetApp / `2026-05-15-preview`
- **Source:** `NetApp/NetAppAccount.tsp`

**TypeSpec source**

```typespec
@removed(Versions.v2026_05_15_preview)
@renamedFrom(Versions.v2026_05_15_preview, "NetAppAccountPatch")
model NetAppAccountPatchStable {
  location?: string;
}
```

**Projection metadata**

```typespec
@removed(Versions.v2026_05_15_preview)
@renamedFrom(Versions.v2026_05_15_preview, "update")
updatePrevious is ArmCustomPatchAsync<
  NetAppAccount,
  PatchModel = NetAppAccountPatchStable
>;
```

| Engine            | Observed result                                                    |
| ----------------- | ------------------------------------------------------------------ |
| Swagger validator | No selected-version occurrence for this removed stable PATCH shape |
| TypeSpec lint     | One diagnostic before projection; none after projection            |

**Explanation:** Unprojected TypeSpec included a declaration that does not
exist in the latest selected service version. `projectionScope:
http-reachable` aligns the TypeSpec program with Swagger and removes exactly
this diagnostic.

**Disposition:** Comparison projection corrected; no production-rule change.

### Gap example: compile-failure exclusion

- **Classification:** count-only
- **Status:** population mismatch
- **Project/API version:** Network / selected latest version
- **Source:** generated corpus metadata

**Report metadata**

```json
{
  "sourceProjectCount": 468,
  "successfulProjectCount": 462,
  "failedProjectCount": 6
}
```

| Engine            | Observed result                                                      |
| ----------------- | -------------------------------------------------------------------- |
| Swagger validator | Raw excluded shard contains three findings                           |
| TypeSpec lint     | Raw excluded shard contains two findings; project compilation failed |

**Explanation:** A failed TypeSpec program cannot support a behavioral
comparison. Both sides are therefore excluded rather than counting available
Swagger output against an unavailable semantic program.

**Disposition:** Explicit population exclusion; no rule change.

## Remaining uncertainty

No semantic uncertainty remains in the assessed corpus. The namespace repair
did not change the aligned project sets or diagnostic totals, showing that the
new cases are direct authorable-shape regressions rather than corpus count
artifacts. The six compile-failed projects are outside the aligned population
and are recorded rather than silently discarded. Raw count equality is neither
expected nor claimed.
