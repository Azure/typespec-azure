# RepeatedPathInfo migration

## Result and gap summary

The latest full corpus covers 462/468 successfully compiled projects.
`RepeatedPathInfo` fires in the same 25 projects on both engines, with no
one-sided projects. Swagger reports 61 diagnostics versus 62 native diagnostics.
The extra native `ManagedCCFProperties.appName` belongs to a model removed from
Confidential Ledger's selected Swagger version (`2026-05-22-preview`): a
version/population mismatch, not a missed check.

The native contract compares authored properties-bag member names with supported
HTTP path/query names, not JSON-encoded keys. Valid `@encodedName` cases
intentionally differ in both directions: an alias can introduce or remove a
JSON duplicate without changing the native result. **Swagger parity is partial**;
corpus overlap does not establish universal equivalence. No production update
is needed for the authoring-name contract. Emitter-free tests cover that contract,
and separate comparison fixtures prove the encoding gap. Six compile failures
remain unassessed; corpus pinning and detailed evidence follow.

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
is reported on each source property whose authored `ModelProperty.name` matches
a supported HTTP PUT path or query parameter name. JSON `@encodedName` overrides
do not change this authoring-name check.

The diagnostic unit is one matching name per concrete PUT operation. The
deduplication set is local to that operation: two PUT operations sharing one
properties declaration produce two diagnostics at the same declaration. Inherited
members are included, but nested model-valued members are not traversed recursively;
cycles and shared siblings therefore do not create extra payload-path diagnostics.
Project-imported members retain their source target. Template sources are skipped
while concrete aliases are checked.

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

### Emitted-field evidence and intentional encoding boundary

The validator selects keys of the resolved request schema's nested `properties`
bag, not TypeSpec source identifiers. The following research matrix distinguishes
field presence from the authored surface; it does not prescribe emitter logic
for the native rule.

| Authored shape                                                      | Validity/support                                            | Selected OpenAPI field present/value                                     | Native check and emission behavior                                                                                                | Swagger / native result | Evidence                                                           |
| ------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| Ordinary or inherited `widgetName` in the bag                       | Supported                                                   | Yes: resolved bag key `widgetName`                                       | Authored name matches; emitted key is unchanged, including through inherited schemas                                              | 1 / 1                   | `body-repeats-path`, `body-repeats-path-in-base`                   |
| Bag member `mode`, HTTP query `mode`                                | HTTP-supported; ARM point-operation lint also reports       | Yes: bag key `mode`                                                      | Native HTTP name matches; emitted JSON key matches query name                                                                     | 1 / 1                   | `body-repeats-query`                                               |
| Multiple direct repeated members                                    | Supported                                                   | Yes: `widgetName`, `resourceGroupName`                                   | Native reports both source names; historical validator snapshot is a representative occurrence rather than normalized count proof | Violation / 2           | `body-repeats-multiple-paths`                                      |
| Tenant-scoped bag member `configName`                               | Supported                                                   | Yes: `configName`                                                        | Native and emitted names match the tenant resource path name                                                                      | 1 / 1                   | `tenant-body-repeats-path`                                         |
| Distinct bag members                                                | Supported                                                   | Bag exists; no matching key                                              | No authored-name or JSON-key match                                                                                                | 0 / 0                   | `body-no-repeats`                                                  |
| Duplicate only on envelope                                          | Rejected by `arm-resource-invalid-envelope-property`        | No matching nested bag key; duplicate is outside selected bag            | Neither check selects the envelope duplicate                                                                                      | 0 / 0                   | `top-level-body-property-only`                                     |
| Duplicate only on PATCH                                             | Supported operation, outside rule scope                     | No selected PUT duplicate; PATCH key is not selected                     | Both checks restrict operation verb to PUT                                                                                        | 0 / 0                   | `patch-body-repeats-path`                                          |
| `@encodedName("application/json", "widgetName") otherName?: string` | Supported, compiles and emits without diagnostics           | Yes: key `widgetName`; `otherName` absent                                | Authored `otherName` does not match; AutoRest applies JSON name override                                                          | 1 / 0, intentional      | `encoded-names/json-name-only.tsp`, native and emission suites     |
| `@encodedName("application/json", "otherName") widgetName?: string` | Supported, compiles and emits without diagnostics           | Yes: key `otherName`; `widgetName` absent                                | Authored `widgetName` matches; AutoRest applies JSON name override                                                                | 0 / 1, intentional      | `encoded-names/authored-name-only.tsp`, native and emission suites |
| Path and query sharing the same HTTP name                           | Already rejected by `@typespec/http/incompatible-uri-param` | Not assessed: invalid source is not an emission-completeness requirement | Native compiler rejects before the lint test                                                                                      | Not applicable          | Native rejection regression                                        |

The alias fixtures are standalone `.tsp` inputs, not parity-harness `main.tsp`
cases. `repeated-path-info.test.ts` loads them without an emitter and asserts the
native outcomes; `repeated-path-info-emission.test.ts` independently emits each,
asserts the precise JSON key and its opposite's absence, resolves local references,
and invokes the installed `RepeatedPathInfo` validator function as Spectral does
on a resolved path item. Both suites require successful compilation; comparison
tests also assert no compiler/emitter diagnostics.

Additional emitter-free regressions assert inherited diagnostic source spans,
supported HTTP parameter aliases, nonrecursive cycles/shared siblings, two
per-operation diagnostics on a shared declaration, project-imported diagnostic
targets, non-model bags, PATCH/envelope exclusion, and template-source exclusion.
They prove the stated native diagnostic unit, not universal emitted-schema parity.

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

Same-cycle recovery adds the following reproducible command, using the repository's
pinned mise tools and checked-in Vitest configuration (30-second test timeout):

```powershell
mise exec -- pnpm --dir packages\typespec-lintdiff exec vitest run test/rules/repeated-path-info.test.ts test/rules/repeated-path-info-emission.test.ts
```

The alias probes show native/Swagger counts `0/1` for `json-name-only` and `1/0`
for `authored-name-only`. Both inputs use standard ARM resource templates and
compile without diagnostics. An initial proposed path/query same-name deduplication
case instead produced `@typespec/http/incompatible-uri-param`; its regression now
asserts that compiler rejection rather than suppressing it or expanding the
native contract to invalid inputs.

The final focused run passes all 12 Vitest tests (10 native, 2 comparison).
The eight existing parity fixtures also pass after the classification change:
five partial-coverage violation cases, three reviewed-ambient compliant cases,
zero unresolved gaps, and unchanged snapshots. Targeted formatting, linting of
the two new test files, and the local package build pass.

The historical full-corpus observations are retained rather than rerun: source
production logic, harness, tool/dependency manifests, lockfile, and specs revision
are unchanged. New tests and corrected local classification do not invalidate
those diagnostic observations. They do invalidate the former universal-equivalence
interpretation. The `coverageKind` is now `partial` to represent intentional
Swagger encoding differences.

## Required TypeSpec changes

No production rule update is required for the authored-name native contract.
This PR refreshes stale focused snapshots and ambient compliance expectations,
records partial Swagger parity in rule metadata, adds emitter-free native and
separate encoding comparison regressions, and corrects this migration evidence.

## Final conclusion

`tsp-lintdiff-local-linter/repeated-path-info` enforces the native authoring
contract: PUT request-body `properties` members must not repeat supported HTTP
PUT path or query parameter names. JSON-encoded property-name overrides remain
outside that check, so Swagger parity is **partial** in both alias directions.
The latest full corpus has complete observed project overlap and no one-sided
projects, not universal supported-shape equivalence. Its raw-count difference
is explained by a removed older-version declaration. Neither that population
difference nor the intentional JSON-name gap requires production encoding logic.
