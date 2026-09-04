# OperationIdNounVerb migration

## Conclusion

The migrated TypeSpec rule is functionally equivalent to the Swagger `OperationIdNounVerb` rule for assessable projects after resolving operation IDs through the same AutoRest/TCGC naming inputs used by generated OpenAPI. The final full corpus has 100% same-project coverage: 34 validator projects, 34 TypeSpec projects, 34 overlapping projects, 111 assessable validator diagnostics, and 111 assessable TypeSpec diagnostics.

The TypeSpec rule **did require a production update**. The previous implementation used `@typespec/openapi` `resolveOperationId`, which missed AutoRest client-location/name behavior and reported operations that TCGC marks as override customizations even though those override operations are not emitted as OpenAPI operations. The updated rule resolves AutoRest-style operation IDs from TCGC client names and client locations and only checks operations present in the TCGC client operation set.

## Required TypeSpec changes

- Updated `packages/typespec-lintdiff/src/rules/operation-id-noun-verb.ts` to resolve operation IDs with `@azure-tools/typespec-client-generator-core` client names and client locations instead of the generic OpenAPI helper.
- Skipped template declarations and TCGC-omitted override customization operations.
- Added fixtures for explicit `@operationId` and namespace-derived operation IDs.
- Marked the fixture coverage as `lint`, opted the rule into `projectionScope: http-reachable`, and refreshed snapshots.

## Source rule

- Linter code: [`OperationIdNounVerb`](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/functions/operation-id-noun-verb.ts)
- Linter doc: [`operation-id-noun-verb.md`](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/docs/operation-id-noun-verb.md)

The Spectral rule ignores empty, non-string, and no-underscore operation IDs. For an ID with an underscore, it takes the first segment as the noun and the second segment as the verb, then reports when the verb matches the noun. When the noun ends in `s`, the validator uses a permissive regex equivalent to allowing the singularized noun as well. It reports at the emitted Swagger `operationId` JSON path.

## Official TypeSpec coverage check

Classification: **gap**.

No official Azure.Core or Azure.ResourceManager rule fully enforces this Swagger behavior. `@azure-tools/typespec-azure-core/no-openapi` warns on explicit `@operationId`, but it does not inspect generated operation IDs and therefore does not catch generated `Noun_VerbWithNoun` values. The ARM RPC coverage document has no `OperationIdNounVerb`, `operationId`, or `Noun_Verb` lint mapping, and ARM templates generate operation IDs but do not reject noun repetition after the underscore.

## Report reconciliation

| Report                                        | Snapshot evidence                                                                                               | Row/category              | Validator projects |                            TypeSpec projects | Official projects | Same-project overlap |      Validator-only |       TypeSpec-only |              Raw diagnostics |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------- | -----------------: | -------------------------------------------: | ----------------: | -------------------: | ------------------: | ------------------: | ---------------------------: |
| `docs/coverage_old.md`                        | external gist snapshot; 450 compiled projects, 210 validator rules                                              | 80-99% coverage           |                 33 | 0 local column not separated from lint count |                 0 |           not listed | not reconstructable | not reconstructable |                   not listed |
| `specs/coverage-breakdown.md` before this fix | specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`; full 462/468 projects                                  | Partial observed coverage |                 34 |                                           54 |                 0 |                   27 |                   7 |                  27 | 111 validator / 263 TypeSpec |
| Final full corpus                             | specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`; generated `2026-09-03T10:45:20.082Z`; 462/468 projects | 100% observed coverage    |                 34 |                                           34 |                 0 |                   34 |                   0 |                   0 | 111 validator / 111 TypeSpec |

The cross-report differences are caused by different snapshots and coverage definitions. The old report is aggregate-only and cannot identify unmatched projects. The lintdiff report compares mapped TypeSpec diagnostics in the same successfully compiled projects and excludes TypeSpec compile failures from behavioral coverage.

## Final corpus evidence

- Specs commit: `f6b53f105b95da05276530a0754a1c71b4f16397`
- Run scope: full, 468 dataset projects, 462 successful, 6 failed
- Analysis timestamp: `2026-09-03T10:45:20.082Z`
- Duration: 1,330,656 ms
- Validator projects: 34
- TypeSpec projects: 34
- Same-project overlap: 34
- Validator-only projects: none
- TypeSpec-only projects: none
- Assessable diagnostics: 111 validator / 111 TypeSpec
- Raw diagnostic shards before failed-project exclusion: 265 validator / 122 TypeSpec
- Excluded by compile failures: 154 validator diagnostics and 11 TypeSpec diagnostics from failed projects
- Deduplicated assessable identities: 111 validator project+file+JSON-path identities, 111 validator project+JSON-path identities, 111 TypeSpec project+source-location identities

Compile-failed projects excluded from the behavioral comparison:

- `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`
- `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`
- `specification/network/resource-manager/Microsoft.Network/Network/Network`
- `specification/quota/resource-manager/Microsoft.Quota/Quota`
- `specification/resources/resource-manager/Microsoft.Resources/deployments`
- `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`

## Emission matrix

| Authored TypeSpec shape                                             | Emitter/helper branch                                        | Selected OpenAPI field                       | Expected Swagger result               | Expected TypeSpec lint result | Fixture/evidence            |
| ------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------- | ------------------------------------- | ----------------------------- | --------------------------- |
| Interface operation `Paths.listPaths`                               | interface + operation client names, standardized by AutoRest | `operationId: "Paths_ListPaths"`             | violation (`Paths` repeats after `_`) | violation                     | `noun-in-verb`              |
| Interface operation `Paths.listPath`                                | interface + operation client names, standardized by AutoRest | `operationId: "Paths_ListPath"`              | violation (singularized `Path`)       | violation                     | `singularized-noun-in-verb` |
| Interface operation `Paths.list`                                    | interface + operation client names, standardized by AutoRest | `operationId: "Paths_List"`                  | no violation                          | no diagnostic                 | `noun-not-in-verb`          |
| Service-root operation `getWidget`                                  | service/root operation name only                             | `operationId: "GetWidget"`                   | ignored, no underscore                | no diagnostic                 | `no-underscore`             |
| Explicit `@operationId("Certificates_GetCertificate")`              | explicit OpenAPI operation ID                                | `operationId: "Certificates_GetCertificate"` | violation                             | violation                     | `explicit-operation-id`     |
| Nested namespace operation `Admins.listAdmins`                      | namespace + operation client names, standardized by AutoRest | `operationId: "Admins_ListAdmins"`           | violation                             | violation                     | `namespace-operation`       |
| TCGC override customization operation in `namespace Customizations` | omitted override operation                                   | no emitted OpenAPI operation                 | no validator diagnostic               | no diagnostic after fix       | Search example below        |

## Gap example: TCGC override customizations omitted from OpenAPI

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** `specification/search/resource-manager/Microsoft.Search/Search` / `2026-09-01-preview`
- **Source:** `client.tsp` customization operations in `namespace Customizations`

**TypeSpec source**

```typespec
namespace Customizations;

#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-operation" "Client-only override, not an ARM resource operation."
#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-action-verb" "Client-only override: retains existing action verb."
@autoRoute
@action("servicesCheckNameAvailability")
op servicesCheckNameAvailabilityCustomization(...): ArmResponse<CheckNameAvailabilityOutput> | CloudError;

@@Azure.ClientGenerator.Core.override(
  ServicesOperationGroup.checkNameAvailability,
  servicesCheckNameAvailabilityCustomization,
  "go,csharp"
);
```

**Emitted OpenAPI or validator behavior**

```json
{
  "operationId": "Services_CheckNameAvailability"
}
```

| Engine            | Observed result                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | No diagnostic: the selected 2026-09-01-preview OpenAPI contains `Services_CheckNameAvailability`, not a `Customizations_*Customization` operation ID.                           |
| TypeSpec lint     | Before this fix, diagnostics were reported for `Customizations_*Customization` override operations. After the fix, Search has no `operation-id-noun-verb` TypeSpec diagnostics. |

**Explanation:** TCGC marks override operations as omitted from the generated client/OpenAPI operation set. The previous rule visited all TypeSpec operations and used generic OpenAPI naming, so it diagnosed authoring helpers that do not correspond to Swagger `operationId` fields. Restricting checks to TCGC client operations matches the Swagger population.

**Disposition:** production rule fix.

## Gap example: AutoRest client-location/name resolution

- **Classification:** TypeSpec-only
- **Status:** fixed
- **Project/API version:** `specification/app/resource-manager/Microsoft.App/ContainerApps` / `2026-01-01`
- **Source:** `Certificate.tsp` operations with back-compatible client-name/client-location customizations

**TypeSpec source**

```typespec
interface Certificates {
  @tag("ManagedEnvironments")
  @summary("Get the specified Certificate.")
  getCertificates is CertificateOperationGroupOps.Read<Certificate>;
}

@@clientName(Certificates.listCertificates, "List");
@@clientName(Certificates.deleteCertificates, "Delete");
@@clientName(Certificates.updateCertificates, "Update");
```

**Emitted OpenAPI or validator behavior**

```json
{
  "operationId": "ManagedCertificates_List"
}
```

| Engine            | Observed result                                                                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | No diagnostic for the previously TypeSpec-only `Certificates_*Certificates` source names in the selected stable OpenAPI.                                                                                 |
| TypeSpec lint     | Before this fix, the rule reported source names such as `Certificates_GetCertificates`. After resolving AutoRest/TCGC operation IDs, ContainerApps has no `operation-id-noun-verb` TypeSpec diagnostics. |

**Explanation:** Generated OpenAPI operation IDs are affected by TCGC client names and locations. Generic `resolveOperationId` does not account for those transformations. The rule now uses TCGC client naming and standardizes operation-id parts like AutoRest.

**Disposition:** production rule fix.

## Gap example: failed-project exclusion

- **Classification:** count-only
- **Status:** population mismatch
- **Project/API version:** `specification/network/resource-manager/Microsoft.Network/Network/Network` / selected corpus version
- **Source:** final corpus compile status

**TypeSpec source**

```text
The project did not compile in the final corpus run and is listed in comparison-results.json unassessedProjects.
```

**Emitted OpenAPI or validator behavior**

```text
Validator shard still contains OperationIdNounVerb diagnostics for this project, but lintdiff excludes failed TypeSpec projects from the behavioral comparison.
```

| Engine            | Observed result                                                             |
| ----------------- | --------------------------------------------------------------------------- |
| Swagger validator | Raw shard includes diagnostics from the retained Swagger files.             |
| TypeSpec lint     | Compile failure prevents reliable TypeSpec lint assessment for the project. |

**Explanation:** Failed TypeSpec projects are retained as compile-failure evidence but excluded from same-project behavioral coverage. This explains why raw validator shard counts (265) are higher than assessable validator diagnostics (111).

**Disposition:** comparison population exclusion, not a rule change.

## Focused fixture validation

`mise exec -- pnpm --dir packages/typespec-lintdiff validate OperationIdNounVerb` passed with six cases:

- `noun-in-verb`: validator violation and direct TypeSpec lint diagnostic
- `singularized-noun-in-verb`: validator violation and direct TypeSpec lint diagnostic
- `explicit-operation-id`: validator violation and direct TypeSpec lint diagnostic
- `namespace-operation`: validator violation and direct TypeSpec lint diagnostic
- `noun-not-in-verb`: validator clean; no mapped TypeSpec diagnostic
- `no-underscore`: validator clean; no mapped TypeSpec diagnostic

## Final equivalence statement

Functional equivalence is established for the assessable corpus and focused fixture matrix. The rule now checks the emitted AutoRest operation ID population rather than every TypeSpec operation declaration. Raw counts are equal for assessable diagnostics, but equality is supporting evidence only; the conclusion rests on the closed fixture matrix, elimination of one-sided project sets, and code-backed fixes for the earlier TypeSpec-only causes. Remaining uncertainty is limited to projects that failed TypeSpec compilation in the corpus and therefore cannot be safely compared by this rule PR.
