import type { LinterRuleSet } from "@typespec/compiler";

export default {
  enable: {
    // Azure core
    "@azure-tools/typespec-azure-core/operation-missing-api-version": true,
    "@azure-tools/typespec-azure-core/auth-required": true,
    "@azure-tools/typespec-azure-core/request-body-problem": true,
    "@azure-tools/typespec-azure-core/byos": true,
    "@azure-tools/typespec-azure-core/casing-style": true,
    "@azure-tools/typespec-azure-core/composition-over-inheritance": true,
    "@azure-tools/typespec-azure-core/use-extensible-enum": true,
    "@azure-tools/typespec-azure-core/known-encoding": true,
    "@azure-tools/typespec-azure-core/long-running-polling-operation-required": true,
    "@azure-tools/typespec-azure-core/no-closed-literal-union": true,
    "@azure-tools/typespec-azure-core/no-enum": true,
    "@azure-tools/typespec-azure-core/no-error-status-codes": true,
    "@azure-tools/typespec-azure-core/no-explicit-routes-resource-ops": true,
    "@azure-tools/typespec-azure-core/no-fixed-enum-discriminator": true,
    "@azure-tools/typespec-azure-core/no-generic-numeric": true,
    "@azure-tools/typespec-azure-core/no-nullable": true,
    "@azure-tools/typespec-azure-core/no-offsetdatetime": true,
    "@azure-tools/typespec-azure-core/no-response-body": true,
    "@azure-tools/typespec-azure-core/no-rpc-path-params": true,
    "@azure-tools/typespec-azure-core/no-operation-id": true,
    "@azure-tools/typespec-azure-core/prefer-csv-collection-format": true,
    "@azure-tools/typespec-azure-core/no-format": true,
    "@azure-tools/typespec-azure-core/no-multiple-discriminator": true,
    "@azure-tools/typespec-azure-core/no-rest-library-interfaces": true,
    "@azure-tools/typespec-azure-core/no-unknown": true,
    "@azure-tools/typespec-azure-core/property-name-conflict": true,
    "@azure-tools/typespec-azure-core/documentation-required": true,
    "@azure-tools/typespec-azure-core/key-visibility-required": true,
    "@azure-tools/typespec-azure-core/response-schema-problem": true,
    "@azure-tools/typespec-azure-core/rpc-operation-request-body": true,
    "@azure-tools/typespec-azure-core/spread-discriminated-model": true,
    "@azure-tools/typespec-azure-core/use-standard-names": true,
    "@azure-tools/typespec-azure-core/use-standard-operations": true,
    "@azure-tools/typespec-azure-core/no-string-discriminator": true,
    "@azure-tools/typespec-azure-core/non-breaking-versioning": true,

    // Azure core not enabled - Arm has its own conflicting rule
    "@azure-tools/typespec-azure-core/bad-record-type": false,

    // Azure resource manager
    "@azure-tools/typespec-azure-resource-manager/arm-no-record": true,
    "@azure-tools/typespec-azure-resource-manager/arm-common-types-version": true,
    "@azure-tools/typespec-azure-resource-manager/arm-delete-operation-response-codes": true,
    "@azure-tools/typespec-azure-resource-manager/arm-put-operation-response-codes": true,
    "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes": true,
    "@azure-tools/typespec-azure-resource-manager/arm-resource-action-no-segment": true,
    "@azure-tools/typespec-azure-resource-manager/arm-resource-duplicate-property": true,
    "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property": true,
    "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-version-format": true,
    "@azure-tools/typespec-azure-resource-manager/arm-resource-key-invalid-chars": true,
    "@azure-tools/typespec-azure-resource-manager/arm-resource-name-pattern": true,
    "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response": true,
    "@azure-tools/typespec-azure-resource-manager/arm-resource-path-segment-invalid-chars": true,
    "@azure-tools/typespec-azure-resource-manager/arm-resource-provisioning-state": true,
    "@azure-tools/typespec-azure-resource-manager/beyond-nesting-levels": true,
    "@azure-tools/typespec-azure-resource-manager/arm-resource-operation": true,
    "@azure-tools/typespec-azure-resource-manager/no-resource-delete-operation": true,
    "@azure-tools/typespec-azure-resource-manager/empty-updateable-properties": true,
    "@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator": true,
    "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-action-verb": true,
    "@azure-tools/typespec-azure-resource-manager/improper-subscription-list-operation": true,
    "@azure-tools/typespec-azure-resource-manager/lro-location-header": true,
    "@azure-tools/typespec-azure-resource-manager/missing-x-ms-identifiers": true,
    "@azure-tools/typespec-azure-resource-manager/no-response-body": true,
    "@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint": true,
    "@azure-tools/typespec-azure-resource-manager/patch-envelope": true,
    "@azure-tools/typespec-azure-resource-manager/arm-resource-patch": true,
    "@azure-tools/typespec-azure-resource-manager/resource-name": true,
    "@azure-tools/typespec-azure-resource-manager/retry-after": true,
    "@azure-tools/typespec-azure-resource-manager/unsupported-type": true,
  },
} satisfies LinterRuleSet;
