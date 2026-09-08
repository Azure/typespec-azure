# TypeSpec vs Azure OpenAPI Validator Validation Report

Generated: `2026-09-08T07:03:34.415Z`

Report path: `C:\dev\worktrees\lintdiff-consistent-response-schema-for-put\packages\typespec-lintdiff\test\fixtures\ConsistentResponseSchemaForPut\validate-report.md`

Filtered rule: `ConsistentResponseSchemaForPut`

Snapshot mode: `update`

## Summary

| Metric | Count |
| --- | ---: |
| Total test cases | 11 |
| Violation tests | 2 |
| Compliance tests | 9 |
| Snapshot mismatches | 0 |
| Snapshot missing | 0 |
| Snapshots updated | 33 |

## Result type guide

| Result type | Count | Confidence | Meaning |
| --- | ---: | --- | --- |
| Covered by direct TypeSpec lint | 2 | High confidence | The validator rule fires and a directly-mapped TypeSpec lint also fires. |
| Provably compliant with reviewed ambient diagnostics | 6 | Reviewed explicit proof | The validator stays silent and the observed ambient TypeSpec diagnostics exactly match the reviewed expectation for the case. |
| Compliance case with reviewed validator discrepancy | 3 | Settled test-quality issue | The compliance test still hits a reviewed validator-only discrepancy, and the observed validator diagnostics match the expectation. |

## Covered by direct TypeSpec lint (2)

The validator rule fires and a directly-mapped TypeSpec lint also fires.

| Test | Mapping | TSP status | Ruleset | Trust | Validator codes | Direct TSP codes | Template TSP codes | Unmapped TSP codes | Suppressed TSP codes | Compliance proof | Snapshots |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ConsistentResponseSchemaForPut/different-inline-response-bodies` | `direct` | `mixed` | `resource-manager` (explicit) | `explicit-ruleset` | `ConsistentResponseSchemaForPut` | `tsp-lintdiff-local-linter/consistent-response-schema-for-put` | — | `@azure-tools/typespec-azure-core/documentation-required`<br>`@azure-tools/typespec-azure-core/require-versioned`<br>`@azure-tools/typespec-azure-core/response-schema-problem`<br>`@azure-tools/typespec-azure-resource-manager/arm-common-types-version`<br>`@azure-tools/typespec-azure-resource-manager/arm-resource-operation`<br>`@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint`<br>`@azure-tools/typespec-azure-resource-manager/no-empty-model`<br>`tsp-lintdiff-local-linter/avoid-anonymous-types`<br>`tsp-lintdiff-local-linter/even-segmented-path-for-put-operation`<br>`tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used`<br>`tsp-lintdiff-local-linter/non-application-json-type`<br>`tsp-lintdiff-local-linter/xms-examples-required` | — | `—` | openapi:updated, tsp:updated, validator:updated |
| `ConsistentResponseSchemaForPut/different-put-responses` | `direct` | `mixed` | `resource-manager` (explicit) | `explicit-ruleset` | `ConsistentResponseSchemaForPut` | `tsp-lintdiff-local-linter/consistent-response-schema-for-put` | — | `@azure-tools/typespec-azure-core/response-schema-problem`<br>`@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response`<br>`tsp-lintdiff-local-linter/description-must-not-be-node-name`<br>`tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used`<br>`tsp-lintdiff-local-linter/path-parameter-schema`<br>`tsp-lintdiff-local-linter/tracked-resources-must-have-put`<br>`tsp-lintdiff-local-linter/xms-examples-required` | — | `—` | openapi:updated, tsp:updated, validator:updated |

## Provably compliant with reviewed ambient diagnostics (6)

The validator stays silent and the observed ambient TypeSpec diagnostics exactly match the reviewed expectation for the case.

| Test | Mapping | TSP status | Ruleset | Trust | Validator codes | Direct TSP codes | Template TSP codes | Unmapped TSP codes | Suppressed TSP codes | Compliance proof | Snapshots |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ConsistentResponseSchemaForPut/missing-response-body` | `direct` | `unmapped-only` | `resource-manager` (explicit) | `explicit-ruleset` | — | — | — | `@azure-tools/typespec-azure-core/documentation-required`<br>`@azure-tools/typespec-azure-core/require-versioned`<br>`@azure-tools/typespec-azure-resource-manager/arm-common-types-version`<br>`@azure-tools/typespec-azure-resource-manager/arm-resource-operation`<br>`@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint`<br>`@azure-tools/typespec-azure-resource-manager/no-response-body`<br>`tsp-lintdiff-local-linter/even-segmented-path-for-put-operation`<br>`tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used`<br>`tsp-lintdiff-local-linter/non-application-json-type`<br>`tsp-lintdiff-local-linter/put-in-operation-name`<br>`tsp-lintdiff-local-linter/xms-examples-required` | — | `reviewed-ambient` | openapi:updated, tsp:updated, validator:updated |
| `ConsistentResponseSchemaForPut/post-200-201-different-schemas` | `direct` | `unmapped-only` | `resource-manager` (explicit) | `explicit-ruleset` | — | — | — | `@azure-tools/typespec-azure-core/documentation-required`<br>`@azure-tools/typespec-azure-core/response-schema-problem`<br>`@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes`<br>`tsp-lintdiff-local-linter/description-must-not-be-node-name`<br>`tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used`<br>`tsp-lintdiff-local-linter/path-parameter-schema`<br>`tsp-lintdiff-local-linter/tracked-resource-patch-operation`<br>`tsp-lintdiff-local-linter/tracked-resources-must-have-put`<br>`tsp-lintdiff-local-linter/xms-examples-required` | — | `reviewed-ambient` | openapi:updated, tsp:updated, validator:updated |
| `ConsistentResponseSchemaForPut/put-200-202-different-schemas` | `direct` | `unmapped-only` | `resource-manager` (explicit) | `explicit-ruleset` | — | — | — | `@azure-tools/typespec-azure-core/documentation-required`<br>`@azure-tools/typespec-azure-core/response-schema-problem`<br>`@azure-tools/typespec-azure-resource-manager/arm-put-operation-response-codes`<br>`@azure-tools/typespec-azure-resource-manager/lro-location-header`<br>`@azure-tools/typespec-azure-resource-manager/no-response-body`<br>`tsp-lintdiff-local-linter/description-must-not-be-node-name`<br>`tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used`<br>`tsp-lintdiff-local-linter/lro-extension`<br>`tsp-lintdiff-local-linter/path-parameter-schema`<br>`tsp-lintdiff-local-linter/tracked-resources-must-have-put`<br>`tsp-lintdiff-local-linter/xms-examples-required` | — | `reviewed-ambient` | openapi:updated, tsp:updated, validator:updated |
| `ConsistentResponseSchemaForPut/put-only-201-response` | `direct` | `unmapped-only` | `resource-manager` (explicit) | `explicit-ruleset` | — | — | — | `@azure-tools/typespec-azure-resource-manager/arm-put-operation-response-codes`<br>`@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response`<br>`tsp-lintdiff-local-linter/description-must-not-be-node-name`<br>`tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used`<br>`tsp-lintdiff-local-linter/path-parameter-schema`<br>`tsp-lintdiff-local-linter/put-request-response-scheme-arm`<br>`tsp-lintdiff-local-linter/tracked-resources-must-have-put`<br>`tsp-lintdiff-local-linter/xms-examples-required` | — | `reviewed-ambient` | openapi:updated, tsp:updated, validator:updated |
| `ConsistentResponseSchemaForPut/same-multiple-content-types` | `direct` | `unmapped-only` | `resource-manager` (explicit) | `explicit-ruleset` | — | — | — | `@azure-tools/typespec-azure-core/documentation-required`<br>`@azure-tools/typespec-azure-core/require-versioned`<br>`@azure-tools/typespec-azure-resource-manager/arm-common-types-version`<br>`@azure-tools/typespec-azure-resource-manager/arm-resource-operation`<br>`@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint`<br>`tsp-lintdiff-local-linter/even-segmented-path-for-put-operation`<br>`tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used`<br>`tsp-lintdiff-local-linter/non-application-json-type`<br>`tsp-lintdiff-local-linter/xms-examples-required` | — | `reviewed-ambient` | openapi:updated, tsp:updated, validator:updated |
| `ConsistentResponseSchemaForPut/same-put-responses` | `direct` | `unmapped-only` | `resource-manager` (explicit) | `explicit-ruleset` | — | — | — | `tsp-lintdiff-local-linter/description-must-not-be-node-name`<br>`tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used`<br>`tsp-lintdiff-local-linter/path-parameter-schema`<br>`tsp-lintdiff-local-linter/xms-examples-required` | — | `reviewed-ambient` | openapi:updated, tsp:updated, validator:updated |

## Compliance case with reviewed validator discrepancy (3)

The compliance test still hits a reviewed validator-only discrepancy, and the observed validator diagnostics match the expectation.

| Test | Mapping | TSP status | Ruleset | Trust | Validator codes | Direct TSP codes | Template TSP codes | Unmapped TSP codes | Suppressed TSP codes | Compliance proof | Snapshots |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ConsistentResponseSchemaForPut/same-external-reference-body` | `direct` | `unmapped-only` | `resource-manager` (explicit) | `explicit-ruleset` | `ConsistentResponseSchemaForPut` | — | — | `@azure-tools/typespec-azure-core/documentation-required`<br>`@azure-tools/typespec-azure-core/require-versioned`<br>`@azure-tools/typespec-azure-resource-manager/arm-resource-operation`<br>`@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint`<br>`tsp-lintdiff-local-linter/even-segmented-path-for-put-operation`<br>`tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used`<br>`tsp-lintdiff-local-linter/xms-examples-required` | — | `reviewed-validator-discrepancy` | openapi:updated, tsp:updated, validator:updated |
| `ConsistentResponseSchemaForPut/same-inline-response-bodies` | `direct` | `unmapped-only` | `resource-manager` (explicit) | `explicit-ruleset` | `ConsistentResponseSchemaForPut` | — | — | `@azure-tools/typespec-autorest/union-unsupported`<br>`@azure-tools/typespec-azure-core/documentation-required`<br>`@azure-tools/typespec-azure-core/no-enum`<br>`@azure-tools/typespec-azure-core/no-unknown`<br>`@azure-tools/typespec-azure-core/require-versioned`<br>`@azure-tools/typespec-azure-core/response-schema-problem`<br>`@azure-tools/typespec-azure-resource-manager/arm-common-types-version`<br>`@azure-tools/typespec-azure-resource-manager/arm-resource-operation`<br>`@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint`<br>`tsp-lintdiff-local-linter/avoid-anonymous-types`<br>`tsp-lintdiff-local-linter/even-segmented-path-for-put-operation`<br>`tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used`<br>`tsp-lintdiff-local-linter/non-application-json-type`<br>`tsp-lintdiff-local-linter/put-in-operation-name`<br>`tsp-lintdiff-local-linter/xms-examples-required` | — | `reviewed-validator-discrepancy` | openapi:updated, tsp:updated, validator:updated |
| `ConsistentResponseSchemaForPut/same-special-response-bodies` | `direct` | `unmapped-only` | `resource-manager` (explicit) | `explicit-ruleset` | `ConsistentResponseSchemaForPut` | — | — | `@azure-tools/typespec-azure-core/documentation-required`<br>`@azure-tools/typespec-azure-core/require-versioned`<br>`@azure-tools/typespec-azure-core/response-schema-problem`<br>`@azure-tools/typespec-azure-resource-manager/arm-common-types-version`<br>`@azure-tools/typespec-azure-resource-manager/arm-resource-operation`<br>`@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint`<br>`tsp-lintdiff-local-linter/even-segmented-path-for-put-operation`<br>`tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used`<br>`tsp-lintdiff-local-linter/non-application-json-type`<br>`tsp-lintdiff-local-linter/put-in-operation-name`<br>`tsp-lintdiff-local-linter/xms-examples-required` | — | `reviewed-validator-discrepancy` | openapi:updated, tsp:updated, validator:updated |

## Confidence framing

- **Settled prerequisite-blocked**: a violation test in `Settled prerequisite-blocked coverage`.
- **Confirmed deficiency**: a violation test in `Confirmed gap without TypeSpec diagnostics`.
- **Possible deficiency**: a violation test in `Possible gap with unmapped TypeSpec diagnostics` or `Gap masked by suppressed TypeSpec diagnostics`.
- **Provably compliant**: a compliance test in `Provably clean compliance case` or `Provably compliant with reviewed ambient diagnostics`.
- **Compliance cleanup needed**: a compliance test in `Compliance case with unreviewed ambient diagnostics`, `Compliance case with unexpected ambient diagnostics`, or `Compliance case with mapped TypeSpec diagnostics`.
- **Settled validator discrepancy**: a compliance test in `Compliance case with reviewed validator discrepancy`.
- **Possible overbroad mapping**: a compliance test in `Compliance case with mapped TypeSpec diagnostics`.
- **Template-mediated coverage**: a violation test in `Settled template-enforced coverage`.
- **Test quality issue**: anything in `Expected violation but validator stayed silent` or `Unexpected validator violation in compliance case`.
