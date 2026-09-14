# RepeatedPathInfo migration

## Result and gap summary

The latest full lintdiff corpus run at specs commit
`f6b53f105b95da05276530a0754a1c71b4f16397` covered 462 successfully compiled
projects out of 468. `RepeatedPathInfo` fired in the same 25 projects on both
engines, with 25/25 same-project overlap, no validator-only projects, and no
TypeSpec-only projects. Raw diagnostics differ by one: Swagger reports 61 and
TypeSpec reports 62. The extra TypeSpec diagnostic is
`ManagedCCFProperties.appName` in Confidential Ledger; that model is removed
from the selected Swagger API version (`2026-05-22-preview`), so the difference
is an API-version/population mismatch rather than a missed Swagger check.
Focused fixtures cover the supported PUT request-body semantics, so no
production rule update is required. The migrated rule is functionally equivalent
for the supported native TypeSpec contract; raw diagnostic equality is not
expected.

## Rule identity

- **Swagger validator rule:** `RepeatedPathInfo`
- **Migrated TypeSpec rule:** `tsp-lintdiff-local-linter/repeated-path-info`
- **Swagger source:** [`body-param-repeated-info.ts`](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/functions/body-param-repeated-info.ts)
- **Swagger docs:** [`repeated-path-info.md`](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/docs/repeated-path-info.md)
- **RPC guideline:** `RPC-Put-V1-05`
- **Native rule file:** `packages/typespec-lintdiff/src/rules/repeated-path-info.ts`
- **Fixture directory:** `packages/typespec-lintdiff/test/fixtures/RepeatedPathInfo`

## Existing TypeSpec coverage check

Searches of `packages/typespec-azure-core/src/rules`,
`packages/typespec-azure-resource-manager/src/rules`, and the ARM RPC coverage
inventory found no official rule or LintDiff-equivalent entry for
`RepeatedPathInfo`/`RPC-Put-V1-05`. The closest official ARM rule is
`arm-resource-duplicate-property`, which compares resource envelope property
names against properties inside the resource `properties` bag. It does not
compare request-body properties against URI or query parameter names, so it does
not cover the material validator behavior. The rule is therefore classified as
an official-rule **gap** that is currently covered by the lintdiff local rule.

## Original Swagger behavior

The Spectral function runs against a resolved OpenAPI path item object. For a
PUT operation it:

1. combines path-item parameters and PUT operation parameters;
2. keeps parameters whose `in` value is `path` or `query`;
3. finds the first body parameter;
4. resolves the body schema and then its nested `properties` schema;
5. reports every nested body property whose name exactly matches one of the
   path or query parameter names.

The diagnostic message is
`The '<name>' already appears in the path, please don't repeat it in the request body.`
and the diagnostic path is the matching PUT operation parameter entry. The
validator does not inspect non-PUT operations, PATCH/update request bodies, or
duplicate top-level resource envelope properties.

## Migrated TypeSpec behavior

The native rule visits operations, skips template declarations/instances,
requires the HTTP verb to be `put`, gathers HTTP path and query parameter names,
and inspects a single model request body. It looks for a model-valued
`properties` member and walks inherited properties inside that bag. A diagnostic
is reported on each source property whose name matches a PUT path or query
parameter. The rule deduplicates by repeated property name because TypeSpec
reports semantic source targets while the Swagger validator reports emitted
OpenAPI occurrences.

## Native semantic matrix

| Authored TypeSpec shape                                                   | Valid/support status                                                            | Native check                                                                                       | Swagger result | TypeSpec result          | Evidence                       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------- | ------------------------ | ------------------------------ |
| PUT resource body has `properties.widgetName` and path has `{widgetName}` | Supported                                                                       | `properties` bag property matches path parameter                                                   | Violation      | Violation                | `body-repeats-path`            |
| PUT resource body inherits `properties.widgetName` from a base model      | Supported                                                                       | inherited `properties` are walked                                                                  | Violation      | Violation                | `body-repeats-path-in-base`    |
| PUT resource body has `properties.mode` and PUT has query `mode`          | Supported, though another lint rejects point-operation query params             | property matches query parameter                                                                   | Violation      | Violation                | `body-repeats-query`           |
| PUT resource body repeats both `widgetName` and `resourceGroupName`       | Supported source model                                                          | both source properties are reported; Swagger fixture emits one representative validator diagnostic | Violation      | Two TypeSpec diagnostics | `body-repeats-multiple-paths`  |
| Tenant-scoped PUT body repeats `configName`                               | Supported                                                                       | tenant-level path parameter is included                                                            | Violation      | Violation                | `tenant-body-repeats-path`     |
| PUT body has no repeated `properties` member                              | Supported                                                                       | no matching property                                                                               | No violation   | No mapped diagnostic     | `body-no-repeats`              |
| Duplicate exists only as a top-level body/envelope property               | Already covered by another ARM lint, outside this validator's nested-bag target | ignored by this rule                                                                               | No violation   | No mapped diagnostic     | `top-level-body-property-only` |
| PATCH body repeats a path parameter                                       | Outside validator scope                                                         | non-PUT skipped                                                                                    | No violation   | No mapped diagnostic     | `patch-body-repeats-path`      |

## Coverage report reconciliation

| Report                                          | Source/pinning                                                                                                  | Row/category           | Validator projects | Local TypeSpec projects | Official credited projects | Same-project overlap |                            Validator-only |                             TypeSpec-only |                   Raw validator diagnostics |                    Raw TypeSpec diagnostics |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------- | -----------------: | ----------------------: | -------------------------: | -------------------: | ----------------------------------------: | ----------------------------------------: | ------------------------------------------: | ------------------------------------------: |
| `docs/coverage_old.md`                          | External gist snapshot, 450 compiled projects, 210 validator rules                                              | 100% coverage          |                 23 |           23 local lint |                          0 |                   23 | not reconstructable from aggregate report | not reconstructable from aggregate report | aggregate report omits this row's raw count | aggregate report omits this row's raw count |
| `specs/coverage-breakdown.md` refreshed locally | specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`, 462/468 successful projects, 215 known validator rules | 100% observed coverage |                 25 |                      25 |                          0 |                   25 |                                         0 |                                         0 |                                          61 |                                          62 |

The two reports use different corpus snapshots and different coverage
definitions. The external report is an aggregate disposition view and does not
include per-project one-sided sets for this row. The refreshed lintdiff report
requires observed same-project diagnostics and provides the project sets used
below.

## Full corpus evidence

- **Command:** `pnpm --dir packages/typespec-lintdiff specs:typespec --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-repeated-path-info --concurrency 6`
- **Coverage refresh:** `pnpm --dir packages/typespec-lintdiff specs:coverage -- --specs-repo C:\dev\worktrees\azure-rest-api-specs-lintdiff-repeated-path-info`
- **Specs commit:** `f6b53f105b95da05276530a0754a1c71b4f16397`
- **Generated at:** `2026-09-14T00:49:26.301Z`
- **Run scope:** full, 468 source projects; 462 successful; 6 unassessed compile failures
- **RepeatedPathInfo project overlap:** 25 validator projects, 25 TypeSpec projects, 25 overlap
- **Validator-only projects:** none
- **TypeSpec-only projects:** none
- **Raw diagnostic counts:** 61 Swagger validator, 62 TypeSpec
- **Normalized diagnostic counts:** not computed by the report for this rule

### Overlap projects

- `specification/apimanagement/resource-manager/Microsoft.ApiManagement/ApiManagement`
- `specification/applicationinsights/resource-manager/Microsoft.Insights/ApplicationInsights/WorkbooksApi`
- `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/Authorization`
- `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/DenyAssignment`
- `specification/authorization/resource-manager/Microsoft.Authorization/Authorization/RoleAssignment`
- `specification/botservice/resource-manager/Microsoft.BotService/BotService`
- `specification/cdn/resource-manager/Microsoft.Cdn/Cdn`
- `specification/confidentialledger/resource-manager/Microsoft.ConfidentialLedger/ConfidentialLedger`
- `specification/cosmos-db/resource-manager/Microsoft.DocumentDB/DocumentDB`
- `specification/cost-management/resource-manager/Microsoft.CostManagement/CostManagement`
- `specification/iothub/resource-manager/Microsoft.Devices/IoTHub`
- `specification/liftrmongodb/MongoDB.Atlas.Management`
- `specification/marketplace/resource-manager/Microsoft.Marketplace/Marketplace`
- `specification/notificationhubs/resource-manager/Microsoft.NotificationHubs/NotificationHubs`
- `specification/operationalinsights/resource-manager/Microsoft.OperationalInsights/OperationalInsights`
- `specification/paloaltonetworks/resource-manager/PaloAltoNetworks.Cloudngfw/Cloudngfw`
- `specification/providerhub/ProviderHub.Management`
- `specification/recoveryservicesbackup/resource-manager/Microsoft.RecoveryServices/RecoveryServicesBackup`
- `specification/resources/resource-manager/Microsoft.Authorization/policy`
- `specification/securityinsights/resource-manager/Microsoft.SecurityInsights/SecurityInsights`
- `specification/sphere/resource-manager/Microsoft.AzureSphere/AzureSphere`
- `specification/sql/resource-manager/Microsoft.Sql/SQL`
- `specification/storage/Storage.Management`
- `specification/storagesync/resource-manager/Microsoft.StorageSync/StorageSync`
- `specification/web/resource-manager/Microsoft.Web/AppService`

### Compile failures

These projects did not compile in the TypeSpec corpus and are excluded from the
behavioral comparison on both sides:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

## Raw and deduplicated diagnostics

The refreshed report has 61 raw Swagger diagnostics and 62 raw TypeSpec
diagnostics. Project-level sets are identical. The only per-project count
difference is Confidential Ledger: Swagger has one diagnostic and TypeSpec has
two. The report does not compute a rule-specific canonical normalized identity,
and no stronger cross-engine identity is needed because there are no one-sided
projects and the single count-only delta is explained below.

## Gap example: removed older resource model in raw TypeSpec lint output

- **Classification:** count-only
- **Status:** population mismatch
- **Project/API version:** `specification/confidentialledger/resource-manager/Microsoft.ConfidentialLedger/ConfidentialLedger` / `2026-05-22-preview`
- **Source:** `typespec/models.tsp`

**TypeSpec source**

```typespec
model LedgerProperties {
  @visibility(Lifecycle.Read)
  ledgerName?: string;
}

@removed(Versions.v2026_02_23)
model ManagedCCFProperties {
  @visibility(Lifecycle.Read)
  appName?: string;
}
```

**Emitted OpenAPI or validator behavior**

```json
{
  "swaggerFile": "preview/2026-05-22-preview/openapi.json",
  "path": "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ConfidentialLedger/ledgers/{ledgerName}",
  "message": "The 'ledgerName' already appears in the path, please don't repeat it in the request body."
}
```

| Engine            | Observed result                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | One `RepeatedPathInfo` diagnostic for `ledgerName` in the selected `2026-05-22-preview` OpenAPI file.                                           |
| TypeSpec lint     | Two raw diagnostics: `ledgerName` and `appName`. `appName` belongs to `ManagedCCFProperties`, which is marked `@removed(Versions.v2026_02_23)`. |

**Explanation:** The retained Swagger corpus compares the selected latest API
version, where the Managed CCF model has already been removed. The TypeSpec raw
lint output still includes the removed older-version declaration, so it records
one extra source diagnostic that has no corresponding selected-version Swagger
object.

**Disposition:** No rule change. This is a version/population mismatch, not an
extra check on a supported selected-version shape.

## Focused fixture evidence

`pnpm --dir packages/typespec-lintdiff validate --rule RepeatedPathInfo` passes
after refreshing stale snapshots and ambient compliance expectations. It found
8 cases: 5 violation cases covered by the migrated TypeSpec lint and 3
validator-clean compliance cases with reviewed ambient diagnostics and no mapped
`repeated-path-info` diagnostic.

## Required TypeSpec changes

No production rule update is required. This PR refreshes the rule metadata,
stale focused snapshots, ambient compliance expectations, and this migration
evidence note.

## Final conclusion

`tsp-lintdiff-local-linter/repeated-path-info` is functionally equivalent to
Swagger `RepeatedPathInfo` for valid supported TypeSpec inputs in the native
contract: PUT request-body `properties` members must not repeat PUT path or
query parameter names. The latest full corpus has complete project overlap and
no one-sided projects. The remaining raw diagnostic count difference is
explained by a removed older-version TypeSpec declaration and does not require a
rule behavior change.
