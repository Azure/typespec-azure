# RepeatedPathInfo migration

## Result and gap summary

The historical full corpus run covers 462/468 successfully compiled projects.
`RepeatedPathInfo` fires in the same 25 projects on both engines, with no
one-sided projects. Swagger reports 61 diagnostics versus 62 native diagnostics.
The extra native `ManagedCCFProperties.appName` belongs to a model removed from
Confidential Ledger's selected Swagger version (`2026-05-22-preview`): a
version/population mismatch, not a missed check. The fixture now applies
`projectionScope: http-reachable` so selected-version comparisons exclude that
unreachable declaration. A focused rerun of the Confidential Ledger project
reports one diagnostic from each engine after projection.

The native contract now compares JSON-encoded properties-bag member names with
supported HTTP path/query names, while targeting the authored declaration.
This repairs both previously intentional `@encodedName` differences: a JSON
alias can introduce or remove a duplicate, just as in the Swagger validator.
Emitter-free native tests and independent emission/validator tests cover both
directions. **Swagger parity remains partial**: native operation populations,
properties-bag selection and diagnostic units are not universally equivalent
to emitted schemas. Historical corpus totals have not been rerun for this repair;
the six historical compile failures remain unassessed.

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

The native rule visits operations, skips generic operation declarations/instances
and operations on generic interface declarations,
requires the HTTP verb to be `put`, gathers HTTP path and query parameter names,
and inspects a single model request body. It looks for a model-valued
`properties` member and walks inherited properties inside that bag. A diagnostic
is reported on each source property whose JSON name from `resolveEncodedName`
matches a supported HTTP PUT path or query parameter name. The JSON name is
used for matching, deduplication and the message; the source property remains
the diagnostic target. Overrides for other media types do not affect the check.

The diagnostic unit is one matching name per concrete PUT operation. The
deduplication set is local to that operation: two PUT operations sharing one
properties declaration produce two diagnostics at the same declaration. Inherited
members are included, but nested model-valued members are not traversed recursively;
cycles and shared siblings therefore do not create extra payload-path diagnostics.
Project-imported members retain their source target. Template sources are skipped
while concrete aliases and operations inherited into concrete interfaces are checked.

### Concrete inherited operation repair

The template guard uses the compiler's declaration-aware predicate rather than
rejecting every operation carrying template-instance metadata. A concrete
interface inheriting a PUT from a generic interface is an actionable HTTP endpoint,
not an uninstantiated template. The canonical native suite covers both repeating
and nonrepeating inherited bodies, including the repeated property's exact source
span. The violating regression produced zero warnings before this repair.

This bounded repair does not refresh the historical corpus totals below or
establish universal Swagger parity. Template-source, per-operation multiplicity,
and emitter-isolation boundaries are retained. The later JSON-name repair changes
only name resolution, not the concrete inherited-operation guard.

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

### Emitted-field evidence and repaired JSON-name boundary

The validator selects keys of the resolved request schema's nested `properties`
bag, not TypeSpec source identifiers. The following research matrix distinguishes
field presence from the authored surface. The native rule obtains JSON names
directly from compiler metadata without emitter dependencies.

| Authored shape                                                      | Validity/support                                            | Selected OpenAPI field present/value                                     | Native check and emission behavior                                                                                                | Swagger / native result | Evidence                                                           |
| ------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| Ordinary or inherited `widgetName` in the bag                       | Supported                                                   | Yes: resolved bag key `widgetName`                                       | Authored name matches; emitted key is unchanged, including through inherited schemas                                              | 1 / 1                   | `body-repeats-path`, `body-repeats-path-in-base`                   |
| Bag member `mode`, HTTP query `mode`                                | HTTP-supported; ARM point-operation lint also reports       | Yes: bag key `mode`                                                      | Native HTTP name matches; emitted JSON key matches query name                                                                     | 1 / 1                   | `body-repeats-query`                                               |
| Multiple direct repeated members                                    | Supported                                                   | Yes: `widgetName`, `resourceGroupName`                                   | Native reports both source names; historical validator snapshot is a representative occurrence rather than normalized count proof | Violation / 2           | `body-repeats-multiple-paths`                                      |
| Tenant-scoped bag member `configName`                               | Supported                                                   | Yes: `configName`                                                        | Native and emitted names match the tenant resource path name                                                                      | 1 / 1                   | `tenant-body-repeats-path`                                         |
| Distinct bag members                                                | Supported                                                   | Bag exists; no matching key                                              | No authored-name or JSON-key match                                                                                                | 0 / 0                   | `body-no-repeats`                                                  |
| Duplicate only on envelope                                          | Rejected by `arm-resource-invalid-envelope-property`        | No matching nested bag key; duplicate is outside selected bag            | Neither check selects the envelope duplicate                                                                                      | 0 / 0                   | `top-level-body-property-only`                                     |
| Duplicate only on PATCH                                             | Supported operation, outside rule scope                     | No selected PUT duplicate; PATCH key is not selected                     | Both checks restrict operation verb to PUT                                                                                        | 0 / 0                   | `patch-body-repeats-path`                                          |
| `@encodedName("application/json", "widgetName") otherName?: string` | Supported, compiles and emits without diagnostics           | Yes: key `widgetName`; `otherName` absent                                | JSON `widgetName` matches; the diagnostic still targets authored `otherName`                                                      | 1 / 1                   | `encoded-names/json-name-only.tsp`, native and emission suites     |
| `@encodedName("application/json", "otherName") widgetName?: string` | Supported, compiles and emits without diagnostics           | Yes: key `otherName`; `widgetName` absent                                | JSON `otherName` does not match; authored `widgetName` alone no longer causes a diagnostic                                        | 0 / 0                   | `encoded-names/authored-name-only.tsp`, native and emission suites |
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

| Report                                                   | Source/pinning                                                                                                  | Row/category           | Validator projects | Local TypeSpec projects | Official credited projects | Same-project overlap |                            Validator-only |                             TypeSpec-only |                   Raw validator diagnostics |                    Raw TypeSpec diagnostics |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------- | -----------------: | ----------------------: | -------------------------: | -------------------: | ----------------------------------------: | ----------------------------------------: | ------------------------------------------: | ------------------------------------------: |
| `docs/coverage_old.md`                                   | External gist snapshot, 450 compiled projects, 210 validator rules                                              | 100% coverage          |                 23 |           23 local lint |                          0 |                   23 | not reconstructable from aggregate report | not reconstructable from aggregate report | aggregate report omits this row's raw count | aggregate report omits this row's raw count |
| `specs/coverage-breakdown.md` historical unprojected run | specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`, 462/468 successful projects, 215 known validator rules | 100% observed coverage |                 25 |                      25 |                          0 |                   25 |                                         0 |                                         0 |                                          61 |                                          62 |

The two reports use different corpus snapshots and different coverage
definitions. The external report is an aggregate disposition view and does not
include per-project one-sided sets for this row. The refreshed lintdiff report
requires observed same-project diagnostics and provides the project sets used
below.

## Historical full corpus evidence

- **Command:** `pnpm --dir packages/typespec-lintdiff specs:typespec --specs-repo <azure-rest-api-specs-worktree> --concurrency 6`
- **Coverage refresh:** `pnpm --dir packages/typespec-lintdiff specs:coverage -- --specs-repo <azure-rest-api-specs-worktree>`
- **Specs path:** replace `<azure-rest-api-specs-worktree>` with the absolute path
  to a clean checkout of the pinned specs commit.
- **Specs commit:** `f6b53f105b95da05276530a0754a1c71b4f16397`
- **Generated at:** `2026-09-14T00:49:26.301Z`
- **Run scope:** full, 468 source projects; 462 successful; 6 unassessed compile failures
- **RepeatedPathInfo project overlap:** 25 validator projects, 25 TypeSpec projects, 25 overlap
- **Validator-only projects:** none
- **TypeSpec-only projects:** none
- **Raw diagnostic counts:** 61 Swagger validator, 62 TypeSpec
- **Normalized diagnostic counts:** not computed by the report for this rule

### Focused selected-version projection check

The Confidential Ledger project was recompiled at its selected API version,
`2026-05-22-preview`, with the harness projection worker. Applying the harness's
`http-reachable` location filter to the historical diagnostics changes the
project's TypeSpec count from 2 to 1: it removes only
`ManagedCCFProperties.appName` and retains `LedgerProperties.ledgerName`. The
project's Swagger count is 1. This focused result validates the metadata change
without presenting the historical 61/62 full-corpus totals as refreshed results.

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

## Historical focused fixture evidence before JSON-name repair

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

## JSON-name repair and acceptance

The later production repair replaces authored-name matching with compiler JSON
name resolution. It reverses only the two alias expectations above and adds
inherited alias/override, query wire-name, other-media-type and shared-declaration
regressions. Existing template guards, PUT-only scope, bag-only nonrecursive
traversal, exact source targets and emitter/TCGC isolation remain covered.
The two independent emission comparisons and all eight existing parity fixtures
remain acceptance requirements. The historical full corpus and its aggregate
counts are not revalidated by these focused checks.

Fresh focused validation at compiler `a6137cac43a727ce0c2656364fd72d50c272ee4a`
passes all 17 native tests and both independent emission/validator comparisons.
The eight existing parity fixtures pass without snapshot changes: five covered
partial-classification violations, three reviewed-ambient compliance controls,
and zero unresolved gaps. The fixture worker also confirms mapped native counts
`1/0` for the two alias inputs against the repaired production build.
Production build, strict changed-test types, scoped normal/type-aware lint,
intended-file formatting and diff hygiene pass. The fixture harness uses the
clean shared validator checkout at `6243cb01c16c7535cd3b8df6f45fbeb3c095ed7f`;
this is not a refresh of the historical source/corpus tuple above.

## Final conclusion

`tsp-lintdiff-local-linter/repeated-path-info` enforces the native authoring
contract: JSON keys of PUT request-body `properties` members must not repeat
supported HTTP PUT path or query parameter names. Both supported alias directions
now agree with the Swagger validator without requiring an emitter at runtime.
Swagger parity remains **partial** rather than universal: historical project
overlap and the explained selected-version count difference do not establish
equivalence for every supported shape or refresh the full-corpus results.
