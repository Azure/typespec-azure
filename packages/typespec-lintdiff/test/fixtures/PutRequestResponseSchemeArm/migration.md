# PutRequestResponseSchemeArm migration

## Result and gap summary

The latest full production corpus at specs commit `f6b53f105b95da05276530a0754a1c71b4f16397` compares 462 successfully compiled TypeSpec projects out of 468 dataset projects. `PutRequestResponseSchemeArm` fires in 36 validator projects and the migrated TypeSpec rule fires in 34 projects; all 34 TypeSpec projects overlap validator projects, leaving 2 validator-only projects and 0 TypeSpec-only projects. Raw comparable diagnostics are 160 validator diagnostics versus 153 TypeSpec diagnostics. The completed TypeSpec update removes false positives for PUT operations whose request type is `void` and therefore emit no request-body schema. The remaining two validator-only projects are PUT operations with a request schema but no `200` response schema; that shape is already covered by ARM response-body rules and is intentionally outside this request/response schema-equality rule's native contract. Functional equivalence is accepted for supported TypeSpec PUT request-body comparisons; raw counts are not expected to match.

## Conclusion

- **Coverage classification:** partial, with an intentional native-contract boundary for missing success response schemas.
- **TypeSpec rule update:** required and completed. `comparePutRequestAndResponse` now skips `void` request or response bodies so TypeSpec does not report operations that do not emit a body schema for the Swagger rule to compare.
- **Remaining uncertainty:** none for the supported request-body equality contract. The residual validator-only projects are explained by Swagger's empty-response-schema behavior on already-invalid/suppressed ARM operations.

## Reports and source revisions

| Source                       | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| External coverage snapshot   | `packages/typespec-lintdiff/docs/coverage_old.md`, gist `https://gist.github.com/catalinaperalta/b2e7d29a33b4b451bcfcc87e8314565a`, 450 compiled projects, 210 validator rules                                                                                                                                                                                                                                                                                        |
| Checked-in lintdiff baseline | [`packages/typespec-lintdiff/specs/coverage-breakdown.md`](../../../specs/coverage-breakdown.md), specs commit `f6b53f105b95da05276530a0754a1c71b4f16397`, full scope 462/468 successful projects; this restored generated baseline records the before-fix row                                                                                                                                                                                                        |
| Post-fix validation run      | Uncommitted full-corpus validation generated `2026-09-11T10:38:48.729Z` at the same specs commit and scope; its post-fix row is recorded below, and its generated `packages/typespec-lintdiff/specs` outputs were restored before publication as required by the lintdiff development workflow                                                                                                                                                                        |
| Validator source             | Azure/azure-openapi-validator at `1198225afecbb818c3050d4d2a91da92e14e56ce`: [ARM rule registration](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/az-arm.ts) and [`putRequestResponseScheme` implementation](https://github.com/Azure/azure-openapi-validator/blob/1198225afecbb818c3050d4d2a91da92e14e56ce/packages/rulesets/src/spectral/functions/put-request-response-scheme.ts) |
| Migrated rule                | `packages/typespec-lintdiff/src/rules/put-request-response-scheme-arm.ts` plus shared comparison helper `put-request-response-scheme-shared.ts`                                                                                                                                                                                                                                                                                                                       |

## Report reconciliation

| Report                                                      | Row/category                | Validator projects | Local TypeSpec projects |             Official credited |    Overlap | Validator-only | TypeSpec-only | Diagnostics                   |
| ----------------------------------------------------------- | --------------------------- | -----------------: | ----------------------: | ----------------------------: | ---------: | -------------: | ------------: | ----------------------------- |
| `coverage_old.md`                                           | `100% coverage`             |                 36 |                      34 |                             2 | not listed |     not listed |    not listed | aggregate project counts only |
| Checked-in `coverage-breakdown.md` baseline before this fix | `Partial observed coverage` |                 36 |                      42 | mapping present, not credited |         34 |              2 |             8 | 160 validator / 184 TypeSpec  |
| Uncommitted full-corpus validation run after this fix       | `Partial observed coverage` |                 36 |                      34 | mapping present, not credited |         34 |              2 |             0 | 160 validator / 153 TypeSpec  |

The old report credited official or otherwise settled coverage, so it reported 100% even though only 34 direct local lint projects fired. The lintdiff report credits only same-project diagnostic overlap in successful TypeSpec projects, so the two response-body-only validator projects remain visible as gaps.

The checked-in [`coverage-breakdown.md`](../../../specs/coverage-breakdown.md) is
the restored generated baseline and therefore still contains the before-fix
42-project/184-diagnostic TypeSpec row. The 34-project/153-diagnostic after-fix
row comes from the uncommitted validation run recorded in this migration
evidence; the generated coverage files were intentionally not committed.

## Validator behavior

The Spectral ARM rule is registered on every PUT operation's `200` or `201` response ancestor:

```ts
given: ["$[paths,'x-ms-paths'].*[put][responses][?(@property === '200' || @property === '201')]^^"],
then: { function: putRequestResponseScheme }
```

The shared function finds the first body parameter schema, returns no diagnostic when there is no request-body schema, then compares that schema with `responses[200].schema` or falls back to `responses[201].schema`. If the response exists but has no schema, the validator compares the request schema with `{}` and reports a mismatch.

## Native TypeSpec behavior

The migrated rule visits ARM provider PUT operations, reads HTTP operation metadata, compares the request body type with the primary `200` response body type or fallback `201` response body type, and reports on the operation when both body schemas exist and differ. The helper compares TypeSpec semantic models, scalars, enums, tuples, unions, arrays, indexers, inherited properties, property optionality, and property types. It now treats `void` request/response bodies as absent schemas, matching the validator's no-request-schema exit and avoiding emitter-specific false positives.

## Native shape matrix

| Authored TypeSpec shape                                              | Valid/support status                                                                  | Selected OpenAPI field                                  | Swagger result | TypeSpec result                                               | Evidence                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| PUT request body and `200` response body use the same resource model | Supported ARM template path                                                           | body parameter schema and `responses[200].schema` match | No diagnostic  | No mapped diagnostic                                          | `compliant` fixture                                                      |
| PUT request body differs from `200` response body                    | Supported custom operation                                                            | both schemas present, `200` selected                    | Diagnostic     | `put-request-response-scheme-arm` diagnostic                  | `request-body-mismatch-response-match`, `arm-resource-mismatch` fixtures |
| PUT has no `200`; request body differs from `201` response body      | Supported custom operation                                                            | both schemas present, `201` fallback selected           | Diagnostic     | `put-request-response-scheme-arm` diagnostic                  | `arm-resource-mismatch-201` fixture                                      |
| PUT request body is `void` and response body exists                  | Supported legacy/no-body authoring; no request schema is emitted                      | no body parameter schema                                | No diagnostic  | No mapped diagnostic after this fix                           | `no-request-body` fixture; DNS corpus example                            |
| PUT request body exists and `200` response has no schema             | Already rejected by ARM response-body guidance, often suppressed in converted sources | body parameter exists, `responses[200].schema` absent   | Diagnostic     | No schema-equality diagnostic; covered by response-body rules | Marketplace and RecoveryServicesBackup examples                          |
| Empty `x-ms-arm-id-details` extension on otherwise equal resource    | Swagger extension metadata only                                                       | schemas remain equal                                    | No diagnostic  | No mapped diagnostic                                          | `empty-arm-id-details` fixture                                           |

## Project-set comparison over aligned population

- **Aligned scope:** production ARM run, selected latest API version per dataset project, successful TypeSpec projects only.
- **Validator projects:** 36.
- **TypeSpec projects:** 34.
- **Overlap:** 34.
- **Validator-only projects:**
  - `specification/marketplace/resource-manager/Microsoft.Marketplace/Marketplace` (`2025-01-01`)
  - `specification/recoveryservicesbackup/resource-manager/Microsoft.RecoveryServices/RecoveryServicesBackup` (`2026-05-31-preview`)
- **TypeSpec-only projects:** none after the `void` body fix.
- **Compile failures excluded from aligned behavior:** `specification/deviceprovisioningservices/resource-manager/Microsoft.Devices/DeviceProvisioningServices`, `specification/monitor/resource-manager/Microsoft.Insights/Insights/TenantActionGroups`, `specification/network/resource-manager/Microsoft.Network/Network/Network`, `specification/quota/resource-manager/Microsoft.Quota/Quota`, `specification/resources/resource-manager/Microsoft.Resources/deployments`, `specification/servicelinker/resource-manager/Microsoft.ServiceLinker/ServiceLinker`.

## Diagnostic cardinality

| Identity                                                          | Count |
| ----------------------------------------------------------------- | ----: |
| Validator raw diagnostics, all result shards                      |   212 |
| Validator raw identity (`project + swaggerFile + JSON path`)      |   192 |
| Validator file-independent identity (`project + JSON path`)       |   168 |
| TypeSpec raw diagnostics, all result shards after fix             |   160 |
| TypeSpec source identity (`project + sourceFile + line + column`) |   160 |
| Comparable successful-project validator diagnostics               |   160 |
| Comparable successful-project TypeSpec diagnostics                |   153 |

Within raw overlapping projects, 31 projects have equal counts. Validator is higher in 4 projects by 51 diagnostics, mostly because the Network project has 47 validator diagnostics but failed TypeSpec compilation in the refreshed corpus and is excluded from the comparable row. TypeSpec is higher in 1 project by 1 diagnostic. These cardinalities use different identity domains and are not the equivalence criterion.

## Gap example: no request body emitted

- **Classification:** TypeSpec-only before fix
- **Status:** fixed
- **Project/API version:** `specification/dns/resource-manager/Microsoft.Network/Dns` / `2023-07-01-preview`
- **Source:** `DnssecConfig.tsp`, `DnssecConfigs.createOrUpdate`

**TypeSpec source**

```typespec
createOrUpdate is Azure.ResourceManager.Legacy.CreateOrReplaceAsync<
  DnssecConfig,
  Request = void,
  Parameters = { @header("If-Match") IfMatch?: string; },
  LroHeaders = ArmLroLocationHeader<FinalResult = DnssecConfig> &
    Azure.Core.Foundations.RetryAfterHeader,
  Error = CloudError
>;
```

**Emitted OpenAPI or validator behavior**

```json
{
  "operationId": "DnssecConfigs_CreateOrUpdate",
  "parameters": [
    { "$ref": ".../ApiVersionParameter" },
    { "name": "If-Match", "in": "header", "type": "string" }
  ],
  "responses": {
    "200": { "schema": { "$ref": "#/definitions/DnssecConfig" } },
    "201": { "schema": { "$ref": "#/definitions/DnssecConfig" } }
  }
}
```

| Engine            | Observed result                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Swagger validator | No diagnostic because `putRequestResponseScheme` finds no `in: body` parameter and returns early.                                                                  |
| TypeSpec lint     | Before this fix, HTTP metadata exposed `void` as a body type and the rule compared it with `DnssecConfig`; after this fix, `void` is skipped as no request schema. |

**Explanation:** `Request = void` is the TypeSpec representation for an operation without an emitted body parameter. Comparing `void` to the response model was broader than the Swagger rule.

**Disposition:** rule fix and `no-request-body` regression fixture.

## Gap example: response schema missing

- **Classification:** validator-only
- **Status:** intentional native-contract boundary
- **Project/API version:** `specification/marketplace/resource-manager/Microsoft.Marketplace/Marketplace` / `2025-01-01`
- **Source:** `PrivateStore.tsp`, `PrivateStores.createOrUpdate`

**TypeSpec source**

```typespec
#suppress "@azure-tools/typespec-azure-resource-manager/no-response-body" "FIXME: Update justification, follow aka.ms/tsp/conversion-fix for details"
createOrUpdate is Azure.ResourceManager.Legacy.CreateOrReplaceSync<
  PrivateStore,
  BaseParameters = Azure.ResourceManager.Foundations.TenantBaseParameters,
  Response = OkResponse,
  Error = ErrorResponse,
  OptionalRequestBody = true
>;
```

**Emitted OpenAPI or validator behavior**

```json
{
  "operationId": "PrivateStore_CreateOrUpdate",
  "parameters": [
    {
      "name": "payload",
      "in": "body",
      "required": false,
      "schema": { "$ref": "#/definitions/PrivateStore" }
    }
  ],
  "responses": {
    "200": { "description": "The request has succeeded." }
  }
}
```

| Engine            | Observed result                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swagger validator | Diagnostic: request model `parameters[2].schema` differs from missing `responses[200].schema`.                                                                                |
| TypeSpec lint     | No `put-request-response-scheme-arm` diagnostic because no response body schema exists to compare; ARM `no-response-body` is the native rule for this invalid response shape. |

**Explanation:** The Swagger helper treats an absent response schema as `{}` and reports this rule. Native TypeSpec keeps response-body absence separate from request/response schema equality; converted sources may suppress `no-response-body`, but reproducing that suppression-sensitive overlap here would conflate two rules.

**Disposition:** intentional parity gap for already-invalid/suppressed response-body absence; no additional schema-equality implementation.

## Gap example: compile-failure-only raw diagnostics

- **Classification:** count-only
- **Status:** population mismatch
- **Project/API version:** `specification/network/resource-manager/Microsoft.Network/Network/Network` / `2025-07-01`
- **Source:** refreshed TypeSpec corpus status

**TypeSpec source**

```text
TypeSpec corpus compile status: failed
raw validator diagnostics for PutRequestResponseSchemeArm: 47
raw TypeSpec diagnostics for put-request-response-scheme-arm before failure: 2
```

**Emitted OpenAPI or validator behavior**

```text
The retained Swagger files for `2025-07-01` validated successfully in the dataset,
but the refreshed TypeSpec compile command failed and the project is excluded from
`coverage-breakdown.md` successful-project counts.
```

| Engine            | Observed result                                                             |
| ----------------- | --------------------------------------------------------------------------- |
| Swagger validator | 47 raw diagnostics in the by-rule shard.                                    |
| TypeSpec lint     | Project excluded from aligned coverage because TypeSpec compilation failed. |

**Explanation:** Raw by-rule shards preserve diagnostics outside the successful TypeSpec population. The coverage row correctly excludes this project from behavioral comparison.

**Disposition:** population mismatch, not a rule change.

## Focused validation

`mise exec -- pnpm --dir packages/typespec-lintdiff validate --rule PutRequestResponseSchemeArm` passes with 6 test cases:

- 3 violation fixtures covered by direct TypeSpec diagnostics.
- 3 compliance fixtures with reviewed ambient diagnostics.
- 0 unresolved fixture gaps.

## Final assessment

The migrated TypeSpec rule now matches the supported native contract for ARM PUT request body versus primary success response body equality, including `200` selection, `201` fallback, semantic model comparison, and no-request-body behavior. Remaining validator-only findings are response-body absence cases that ARM TypeSpec validates through response-body rules rather than by simulating the Swagger helper's `{}` response schema comparison. The rule is functionally equivalent within that boundary; raw diagnostic counts differ for documented population and rule-boundary reasons.
