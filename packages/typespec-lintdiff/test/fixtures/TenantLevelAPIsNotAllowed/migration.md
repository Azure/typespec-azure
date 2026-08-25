# TenantLevelAPIsNotAllowed migration investigation

## Conclusion

The migrated TypeSpec rule required an update. The Swagger
`TenantLevelAPIsNotAllowed` function examines every emitted OpenAPI path and
flags any PUT path that starts with `/providers`, except paths ending in
`/operations`. The former TypeSpec rule only inspected resources classified as
tenant resources, so it missed management-group extension PUTs whose emitted
paths also start with `/providers`.

After changing the TypeSpec rule to inspect all HTTP operations, the full corpus
run at specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`,
generated at `2026-08-25T09:19:24Z`, produced 24 Swagger projects, 24
TypeSpec projects, 24 overlapping projects, and no one-sided projects in the
successfully compiled population. The migrated rule is functionally equivalent
for the assessed population.

Raw diagnostic equality is neither required nor expected. The Swagger
implementation stops after the first matching path in each OpenAPI document,
while TypeSpec reports every matching semantic operation.

## Required TypeSpec changes

1. Change `src/rules/tenant-level-apis-not-allowed.ts` from ARM resource
   classification to resolved HTTP operation paths.
2. Add `management-group-extension-put` as a violating fixture for a
   management-group extension PUT that starts with `/providers`.
3. Add `providers-root-put` to cover Swagger's exact `startsWith("/providers")`
   behavior without requiring a trailing slash.
4. Preserve the tenant-resource, subscription-resource, scope-based extension,
   non-PUT, and custom-PUT fixtures as regression controls.

No emitter, Swagger validator, corpus generator, or comparison normalization
change is required.

## Report reconciliation

| Report                                                  | Source revision / generation                                                                       | Population                                         | Row                                           | Validator projects | TypeSpec projects |               Overlap |      Validator-only | TypeSpec-only | Diagnostics             |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------- | -----------------: | ----------------: | --------------------: | ------------------: | ------------: | ----------------------- |
| `docs/coverage_old.md`                                  | external report snapshot checked into this repository; generator revision not recorded             | 450 compiled projects, 210 validator rules         | `TenantLevelAPIsNotAllowed none 24 15 0 62.5` |                 24 |                15 | not listed separately | not reconstructable |    not listed | not listed              |
| checked-in `specs/coverage-breakdown.md` before the fix | specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`; full run over 462/468 successful projects | 462 successful projects, 215 known validator rules | `TenantLevelAPIsNotAllowed production`        |                 24 |                15 |                    15 |                   9 |             0 | 24 Swagger, 48 TypeSpec |
| refreshed full corpus after the fix                     | same specs commit; generated `2026-08-25T09:19:24Z`; full run over 462/468 successful projects     | 462 successful projects, 215 known validator rules | `TenantLevelAPIsNotAllowed production`        |                 24 |                24 |                    24 |                   0 |             0 | 24 Swagger, 69 TypeSpec |

The external report provides aggregate migration credit and cannot reconstruct
the individual unmatched projects. The lint-diff report requires observed
same-project diagnostics and supplies project-level shards. The former 9-project
gap was therefore reproducible only from the lint-diff data.

## Former semantic gap

The former validator-only projects were:

- `specification/alertsmanagement/resource-manager/Microsoft.AlertsManagement/TenantActivityLogAlerts`
- `specification/edge/resource-manager/Microsoft.Edge/sites`
- `specification/education/resource-manager/Microsoft.Education/Education`
- `specification/management/resource-manager/Microsoft.Management/ManagementGroups`
- `specification/monitoringservice/resource-manager/Microsoft.Monitor/Slis`
- `specification/policyinsights/resource-manager/Microsoft.PolicyInsights/PolicyInsights/PolicyInsightsApi`
- `specification/resources/resource-manager/Microsoft.Authorization/policy`
- `specification/resources/resource-manager/Microsoft.Resources/deploymentStacks`
- `specification/support/resource-manager/Microsoft.Support/Support`

These projects author management-group or other extension PUT operations. Their
paths begin with `/providers`, so Swagger diagnoses them even though TypeSpec
does not classify their resource models as tenant resources.

### Gap example: management-group extension PUT

- **Classification:** validator-only
- **Status:** fixed
- **Project/API version:** `specification/alertsmanagement/resource-manager/Microsoft.AlertsManagement/TenantActivityLogAlerts` / `2023-04-01-preview`
- **Source:** `TenantActivityLogAlertResource.tsp:57`

**TypeSpec source**

```typespec
createOrUpdate is Extension.CreateOrReplaceSync<
  ManagementGroup,
  TenantActivityLogAlertResource
>;
```

**Emitted OpenAPI**

```json
"/providers/Microsoft.Management/managementGroups/{managementGroupName}/providers/Microsoft.AlertsManagement/tenantActivityLogAlerts/{alertRuleName}": {
  "put": {
    "operationId": "TenantActivityLogAlerts_CreateOrUpdate"
  }
}
```

| Engine                   | Observed result                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| Swagger validator        | One `TenantLevelAPIsNotAllowed` diagnostic on the path.                                    |
| TypeSpec lint before fix | No diagnostic because the resource was an extension resource, not a tenant resource.       |
| TypeSpec lint after fix  | One diagnostic on `createOrUpdate` because the resolved PUT path starts with `/providers`. |

**Explanation:** Swagger classifies the emitted path text, not the ARM resource
base type. The former TypeSpec traversal used a narrower semantic proxy.

**Disposition:** The production rule now traverses resolved HTTP operations and
applies the same verb, prefix, and `/operations` exemption checks.

### Gap example: exact providers root

- **Classification:** validator-only
- **Status:** fixed
- **Project/API version:** focused fixture / `2024-01-01`
- **Source:** `providers-root-put/main.tsp`

**TypeSpec source**

```typespec
@put
@route("/providers")
update(): void;
```

**Emitted OpenAPI**

```json
"/providers": {
  "put": {
    "operationId": "ProviderRoot_Update"
  }
}
```

| Engine                          | Observed result                                                           |
| ------------------------------- | ------------------------------------------------------------------------- |
| Swagger validator               | One diagnostic because `/providers` satisfies `startsWith("/providers")`. |
| TypeSpec lint before review fix | No diagnostic because the prefix required `/providers/`.                  |
| TypeSpec lint after review fix  | One diagnostic on `update`.                                               |

**Explanation:** The trailing slash requirement was narrower than the exact
Swagger prefix check.

**Disposition:** The path predicate now uses `startsWith("/providers")`.

## Refreshed full-corpus result

| Measure                                        | Count |
| ---------------------------------------------- | ----: |
| Source projects                                |   468 |
| Projects processed                             |   468 |
| TypeSpec compile failures                      |     6 |
| Successful comparison population               |   462 |
| Validator projects in successful population    |    24 |
| TypeSpec projects in successful population     |    24 |
| Same-project overlap                           |    24 |
| Validator-only projects                        |     0 |
| TypeSpec-only projects                         |     0 |
| Validator diagnostics in successful population |    24 |
| TypeSpec diagnostics in successful population  |    69 |

The selected-latest-version comparison has no TypeSpec-only projects and
excluded no diagnostics solely because they belonged to older API versions.
The seven raw TypeSpec diagnostics outside the successful population came from
four projects that failed compilation.

## Compile failures

The six failed projects were:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

`TenantActionGroups`, `Network`, and `Quota` failed with
`@typespec/http/missing-uri-param`; `deployments`,
`DeviceProvisioningServices`, and `ServiceLinker` failed with
`@typespec/http/duplicate-body`. The first four projects had both raw Swagger
and raw TypeSpec findings for this rule and were removed from both sides of the
formal comparison. The other two had no finding for this rule. These failures
reduce the assessed population but do not create a one-sided result.

### Gap example: missing URI parameters exclude both engines

- **Classification:** count-only
- **Status:** population mismatch
- **Project/API version:** `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups` / `2023-05-01-preview`
- **Source:** `TenantActionGroupResource.tsp:93`

**TypeSpec source**

```typespec
createOrUpdate is Extension.CreateOrReplaceSync<
  Extension.ManagementGroup<"managementGroupId">,
  TenantActionGroupResource
>;
```

**Compiler result**

```text
error @typespec/http/missing-uri-param:
Route reference parameter 'subscriptionId' but wasn't found in operation parameters
```

| Engine            | Observed result                                                                   |
| ----------------- | --------------------------------------------------------------------------------- |
| Swagger validator | One raw diagnostic on the management-group PUT path.                              |
| TypeSpec lint     | One raw diagnostic on `createOrUpdate`, but the project compile status is failed. |

**Explanation:** The runner captures lint warnings emitted before the compiler
returns failure. Coverage excludes failed projects from both populations.

**Disposition:** Population exclusion; no rule change.

### Gap example: duplicate body excludes both engines

- **Classification:** count-only
- **Status:** population mismatch
- **Project/API version:** `specification/resources/resource-manager/Microsoft.Resources/deployments` / `2025-04-01`
- **Source:** `DeploymentExtended.tsp`

**TypeSpec source**

```typespec
createOrUpdateAtTenantScope is Azure.ResourceManager.Legacy.Extension.CreateOrUpdateAsync<
  Extension.Tenant,
  DeploymentExtended,
  Request = ScopedDeployment,
  LroHeaders = ArmLroLocationHeader<FinalResult = DeploymentExtended> &
    Azure.Core.Foundations.RetryAfterHeader,
  Error = CloudError
>;

createOrUpdateAtManagementGroupScope is Azure.ResourceManager.Legacy.Extension.CreateOrUpdateAsync<
  Extension.ManagementGroup<"groupId">,
  DeploymentExtended,
  Request = ScopedDeployment,
  LroHeaders = ArmLroLocationHeader<FinalResult = DeploymentExtended> &
    Azure.Core.Foundations.RetryAfterHeader,
  Error = CloudError
>;
```

**Compiler result**

```text
error @typespec/http/duplicate-body:
Operation has a @body and an unannotated parameter.
There can only be one representing the body
```

| Engine            | Observed result                                                |
| ----------------- | -------------------------------------------------------------- |
| Swagger validator | One raw diagnostic on the first matching PUT path in the file. |
| TypeSpec lint     | Two raw diagnostics, but the project compile status is failed. |

**Explanation:** The unrelated duplicate-body error excludes this project from
both sides after the TypeSpec warnings have already been collected.

**Disposition:** Population exclusion; no rule change.

## Diagnostic cardinality

Across all raw shards, including failed projects, both engines fired in 28
projects: Swagger produced 28 diagnostics and TypeSpec produced 76. Over the
successful population:

| Identity                                       | Count |
| ---------------------------------------------- | ----: |
| Swagger raw diagnostics                        |    24 |
| Swagger project + file + JSON path             |    24 |
| Swagger project + JSON path                    |    24 |
| TypeSpec raw diagnostics                       |    69 |
| TypeSpec project + source file + line + column |    69 |

Ten projects have equal per-project counts. TypeSpec has higher counts in 14
projects, with a total positive difference of 45; Swagger is higher in no
project. The identities are intentionally different: Swagger's function calls
`break` after the first matching path in each document, while TypeSpec reports
every matching authored operation.

### Gap example: validator stops after the first matching path

- **Classification:** count-only
- **Status:** intentional
- **Project/API version:** `specification/education/resource-manager/Microsoft.Education/Education` / `2021-12-01-preview`
- **Source:** `LabDetails.tsp:120`, `StudentDetails.tsp:87`

**TypeSpec source**

```typespec
createOrUpdate is InvoiceSectionLabOps.CreateOrUpdateSync<LabDetails, ...>;
createOrUpdate is InvoiceSectionStudentOps.CreateOrUpdateSync<StudentDetails, ...>;
```

**Emitted OpenAPI**

```json
{
  "paths": {
    "/providers/Microsoft.Billing/billingAccounts/{billingAccountName}/billingProfiles/{billingProfileName}/invoiceSections/{invoiceSectionName}/providers/Microsoft.Education/labs/default": {
      "put": { "operationId": "Labs_CreateOrUpdate" }
    },
    "/providers/Microsoft.Billing/billingAccounts/{billingAccountName}/billingProfiles/{billingProfileName}/invoiceSections/{invoiceSectionName}/providers/Microsoft.Education/labs/default/students/{studentAlias}": {
      "put": { "operationId": "Students_CreateOrUpdate" }
    }
  }
}
```

| Engine            | Observed result                                                             |
| ----------------- | --------------------------------------------------------------------------- |
| Swagger validator | One diagnostic: it stops after the first matching path in `education.json`. |
| TypeSpec lint     | Two diagnostics, one for each `createOrUpdate` operation.                   |

**Explanation:** The count difference is an upstream validator control-flow
defect, not a semantic distinction between the two PUT operations.

**Disposition:** Preserve complete TypeSpec coverage; do not copy Swagger's
first-match-only behavior.

## Fixture evidence

| Fixture                          | Swagger result | TypeSpec result         |
| -------------------------------- | -------------- | ----------------------- |
| `tenant-level-put`               | one violation  | one matching diagnostic |
| `tenant-level-custom-put`        | one violation  | one matching diagnostic |
| `management-group-extension-put` | one violation  | one matching diagnostic |
| `providers-root-put`             | one violation  | one matching diagnostic |
| `subscription-level-put`         | no violation   | no mapped diagnostic    |
| `extension-resource-put`         | no violation   | no mapped diagnostic    |
| `tenant-level-no-put`            | no violation   | no mapped diagnostic    |

The management-group extension fixture directly covers the former semantic
miss. Ambient fixture diagnostics from other rules remain recorded separately
in snapshots.

## Final statement

Within the 462 successfully compiled projects, all validator projects are
covered, no TypeSpec-only projects remain, and focused fixtures cover every
important branch. Raw count differences are explained by Swagger stopping
after its first matching path, while TypeSpec reports all semantic operations.
Four additional projects have matching raw project-level behavior but remain
formally unassessed because of unrelated compiler errors. No unresolved rule
semantic gap remains.
