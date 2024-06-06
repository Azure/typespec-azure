import type { LinterRuleSet } from "@typespec/compiler";

export default {
  enable: {
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
    "@azure-tools/typespec-azure-core/bad-record-type": true,
    "@azure-tools/typespec-azure-core/documentation-required": true,
    "@azure-tools/typespec-azure-core/key-visibility-required": true,
    "@azure-tools/typespec-azure-core/response-schema-problem": true,
    "@azure-tools/typespec-azure-core/rpc-operation-request-body": true,
    "@azure-tools/typespec-azure-core/spread-discriminated-model": true,
    "@azure-tools/typespec-azure-core/use-standard-names": true,
    "@azure-tools/typespec-azure-core/use-standard-operations": true,
    "@azure-tools/typespec-azure-core/no-string-discriminator": true,

    // Azure core rules enabled via an optional rulesets
    "@azure-tools/typespec-azure-core/non-breaking-versioning": false,
  },
} satisfies LinterRuleSet;
