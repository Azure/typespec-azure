# GetResponseCodes migration

## Result and gap summary

On the pinned ARM corpus, the production Swagger validator reports **96 diagnostics
in 15 projects**; the corrected TypeSpec rule reports **96 diagnostics in the
same 15 projects**, with no one-sided projects or per-project count differences.
The full run compiled 462 of 468 projects. Before this change, the TypeSpec rule
also warned on 25 global SDK-customization operations in `client.tsp` across
six projects; those operations are outside the ARM provider and do not emit as
ARM GET operations. Its descendant-searching provider check caused the extra
warnings and missed GETs in nested provider namespaces. Checking provider
**ancestry** fixes both defects. The TypeSpec rule update and a nested-provider
regression fixture are required and completed. The tested native GET response
contract is functionally equivalent to the validator's checks, **not because
the raw totals happen to match**: compilation failures, version attribution,
and unsupported Swagger-only response shapes limit any universal claim.

## Scope and report reconciliation

The corpus is pinned to Azure/azure-rest-api-specs
`f6b53f105b95da05276530a0754a1c71b4f16397`; the dataset was generated
2026-08-06 by `test/harness/spec-dataset.ts`. The full TypeSpec run completed
2026-09-29 with `test/harness/typespec-results.ts`, 468 attempted, 462
successfully compiled, six unassessed. It runs local rules on unprojected
TypeSpec source; validator input is the retained emitted Swagger for the
dataset-selected API version. The runner uses the ARM ruleset; no readme
suppression is applied to the retained validator corpus. Failed TypeSpec
projects are removed from both sides of behavioral comparison. Validator
results use the production rule, not a staging-only run.

| Report                                                                                        | Population and definition                                                              |                       Validator |                          Local TypeSpec |   Official |                 Overlap |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------: | --------------------------------------: | ---------: | ----------------------: |
| [External coverage snapshot](../../../docs/coverage_old.md), 100% lint row                    | 450 compiled projects; migration-disposition credit, report revision/date not embedded |                     14 projects |                             14 projects |          0 | Not recorded separately |
| [Previously checked-in observed report](../../../specs/coverage-breakdown.md) before this run | 462/468 assessable; same-project diagnostics only                                      |     15 projects, 96 diagnostics | 19 assessable projects, 120 diagnostics | No mapping |             15 projects |
| Refreshed [observed report](../../../specs/coverage-breakdown.md), 100% row                   | 462/468 assessable; same-project diagnostics only                                      | **15 projects, 96 diagnostics** |         **15 projects, 96 diagnostics** | No mapping |         **15 projects** |

The archived pre-change TypeSpec shard actually had 121 diagnostics in 20
projects; one of those projects failed compilation and so contributes neither
side to the observed report's 19/120 row. The revision of the external snapshot
and individual project identities are unavailable in that aggregate report:
its 14 versus 15 cannot be assigned to a project by subtraction. Its
450-project population and coverage-credit definition differ from this
462-project, observed-overlap comparison. The 25 pre-change extra TypeSpec
diagnostics are attributable to the provider lookup defect, not to additional
valid ARM GET violations (see the [example](#gap-example-global-sdk-override)
below).

## Comparable project sets and diagnostic identities

Validator-only projects: **none**. TypeSpec-only projects: **none**. All 15
validator projects overlap; their per-project diagnostic counts also match.
Neither aggregate equality nor project overlap identifies individual Swagger
paths with individual TypeSpec source declarations.

| Project suffix                                                  | Validator | TypeSpec |
| --------------------------------------------------------------- | --------: | -------: |
| `advisor/.../Advisor`                                           |         3 |        3 |
| `app/.../ContainerApps`                                         |         2 |        2 |
| `consumption/.../Consumption`                                   |         6 |        6 |
| `cost-management/.../CostManagement`                            |         1 |        1 |
| `databricks/.../Databricks`                                     |         1 |        1 |
| `datafactory/.../DataFactory`                                   |         7 |        7 |
| `guestconfiguration/.../Assignments`                            |         2 |        2 |
| `keyvault/.../KeyVault`                                         |         2 |        2 |
| `recoveryservicesbackup/.../RecoveryServicesBackup`             |         5 |        5 |
| `relay/.../Relay`                                               |         1 |        1 |
| `security/.../OperationsAPI`                                    |         1 |        1 |
| `serialconsole/.../SerialConsole`                               |         1 |        1 |
| `servicefabricmanagedclusters/.../ServiceFabricManagedClusters` |         1 |        1 |
| `solutions/Solutions.Management`                                |         5 |        5 |
| `web/.../AppService`                                            |        58 |       58 |

Validator raw project + Swagger file + JSON path: **96**. Deduplicated
project + JSON path: **96**. TypeSpec raw and deduplicated project + source
file + line + column: **96** each. Projects with equal deduplicated counts:
**15**; validator-higher: **0**; TypeSpec-higher: **0**; total positive and
negative differences: **0** each. These are distinct identity domains.
There are no remaining one-sided projects or cardinality outliers to normalize.

The runner did not project TypeSpec to each selected version before counting:
the 96 are raw unprojected diagnostics, not a separately proven 96
selected-latest-version diagnostic identity set. No TypeSpec-only project
remains to attribute to an older version; zero diagnostics were _demonstrated_
to be older-version-only and zero were excluded by projection. A statement
of universal per-operation parity would need projected identities. The six
unassessed projects are DeviceProvisioningServices, TenantActionGroups,
Network/Network, Quota, Resources/deployments, and ServiceLinker. The compared
validator rule has no positive project among those exclusions; their absence
still limits completeness.

## Native contract and fixtures

The native rule inspects supported TypeSpec HTTP GET operations through
`getHttpOperation`, within an ARM provider namespace or one of its descendants.
It reports **one diagnostic on the operation** when resolved responses are
empty, omit the numeric `200` response, or include a code other than numeric
`200`, numeric `202`, or default `*`. The `empty` branch is defensive:
the fixture harness always emits at least one HTTP response. The rule does
not require a default error response or require a Location header on `202`;
those are separate validator concerns. Its provider-ancestry check isolates
the temporary mixed ARM/data-plane lintdiff runner; the official ARM ruleset
will provide that boundary instead.

The [validator source](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/functions/get-response-codes.ts)
checks `Object.keys(getOp.responses)`: nonempty, includes `200`, and only
`200`, `202`, or `default`. The
[validator documentation](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/docs/get-response-codes.md)
describes a Location header on `202`, but that condition is absent from this
rule's implementation. The official ARM linter registers PUT, POST, and
DELETE response-code checks but no GET response-code check; its
`arm-resource-operation-response` rule compares resource schemas rather than
status codes. ARM templates provide conventional GET responses but allow the
authored `ErrorResponse`-only and extra-`201` fixtures below. This is a native
lint gap, not an already-enforced official rule or unrepresentable template
violation.

| Authored fixture          | Supported native shape / emitted response codes | Swagger   | TypeSpec  |
| ------------------------- | ----------------------------------------------- | --------- | --------- |
| `get-200-and-default`     | ARM resource GET, `200`, default                | Clean     | Clean     |
| `get-200-only`            | ARM resource GET, `200`                         | Clean     | Clean     |
| `get-202-with-location`   | ARM GET, `200`, `202`, default                  | Clean     | Clean     |
| `get-missing-200`         | ARM GET, default only                           | Violation | Violation |
| `get-extra-201`           | ARM GET, `200`, `201`, default                  | Violation | Violation |
| `get-extra-response-code` | ARM GET, `200`, `204`, default                  | Violation | Violation |
| `get-nested-missing-200`  | Nested ARM namespace GET, default only          | Violation | Violation |

All seven fixtures pass strict snapshot validation. The nested case exercises
the repaired namespace traversal on valid TypeSpec input. All violations
target their GET operations. Empty Swagger `responses: {}` is supported by
the validator but not produced by the TypeSpec HTTP emission in this harness;
there is no native-specific special case beyond the existing defensive
empty-response check. The above cases cover authored resource response,
error-only response, accepted/polling response, disallowed success response
and inherited provider namespace without simulating Swagger emission.

### Gap example: global SDK override

- **Classification:** TypeSpec-only and count-only, before the fix
- **Status:** fixed
- **Project/API version:** `specification/databoxedge/resource-manager/Microsoft.DataBoxEdge/DataBoxEdge` / `2023-12-01`
- **Source:** `client.tsp:148`, `StorageAccountsDeleteCustomized`

**TypeSpec source**

```typespec
op StorageAccountsDeleteCustomized(
  ...Azure.ResourceManager.ProviderNamespace<StorageAccount>,
  // Additional request parameters omitted here.
): void;
@@override(StorageAccounts.delete, StorageAccountsDeleteCustomized, "python,go,javascript");
```

**Emitted OpenAPI and validator behavior**

The retained `swagger/stable/2023-12-01/databoxedge.json` contains:

```json
{
  "get": { "operationId": "StorageAccounts_Get" },
  "delete": { "operationId": "StorageAccounts_Delete" }
}
```

This excerpts operation IDs from the shared storage-account path, omitting
other object properties: the GET's actual response keys are `200`, `default`;
the DELETE's are `202`, `204`, `default`. There is no emitted GET operation for
the global SDK override, and the validator reports zero `GetResponseCodes`
diagnostics in this project.

| Engine                   | Result                                                                    |
| ------------------------ | ------------------------------------------------------------------------- |
| Swagger validator        | No violation: emitted storage-account GET has `200`, default.             |
| TypeSpec lint before fix | Warning on the global SDK override at `client.tsp:148`; absent after fix. |

**Explanation:** The old `resolveProviderNamespace(program, operation.namespace)`
searched _descendants_, so the global namespace containing a provider was
mistaken for a provider's descendant. The undecorated global SDK customization
operation is interpreted as an HTTP GET by `getHttpOperation` but is not an
authored provider GET. The fix checks actual provider ancestry, leaving
SDK-only global operations alone and including nested ARM operations.

**Disposition:** Correct the lintdiff-only mixed-ruleset isolation guard.
The archived pre-change shard lost 25 warnings across six `client.tsp` files:
ApiManagement (1), DataBoxEdge (12), DeviceProvisioningServices (1),
PowerPlatform (1), RecoveryServicesBackup (7), and WebPubSub (3). Five projects
no longer appear on the TypeSpec-only side; the sixth still has real shared
findings. One of the six, DeviceProvisioningServices, fails compilation and
was excluded from the assessable observed row.

## Conclusion

The corrected TypeSpec rule needs no additional native predicate for the
tested ARM GET contract. It addresses the proven provider-ancestry defect and
matches the validator's implemented response-code checks on all focused
authorable fixtures and affected successfully compiled projects. Exact
Swagger equivalence is not asserted for unrepresentable empty-response
Swagger, unprojected historical versions, or the six compile failures;
matching raw counts are supporting evidence, not the criterion.
