import { defineLinter } from "@typespec/compiler";
import { apiVersionRule } from "./rules/api-version-parameter.js";
import { authRequiredRule } from "./rules/auth-required.js";
import { byosRule } from "./rules/byos.js";
import { casingRule } from "./rules/casing.js";
import { compositionOverInheritanceRule } from "./rules/composition-over-inheritance.js";
import { extensibleEnumRule } from "./rules/extensible-enums.js";
import { friendlyNameRule } from "./rules/friendly-name.js";
import { knownEncodingRule } from "./rules/known-encoding.js";
import { longRunningOperationsRequirePollingOperation } from "./rules/lro-polling-operation.js";
import { noClosedLiteralUnionRule } from "./rules/no-closed-literal-union.js";
import { noEnumRule } from "./rules/no-enum.js";
import { noErrorStatusCodesRule } from "./rules/no-error-status-codes.js";
import { noExplicitRoutesResourceOps } from "./rules/no-explicit-routes-resource-ops.js";
import { noFixedEnumDiscriminatorRule } from "./rules/no-fixed-enum-discriminator.js";
import { noNullableRule } from "./rules/no-nullable.js";
import { noOffsetDateTimeRule } from "./rules/no-offsetdatetime.js";
import { operationIdRule } from "./rules/no-operation-id.js";
import { noResponseBodyRule } from "./rules/no-response-body.js";
import { noRpcPathParamsRule } from "./rules/no-rpc-path-params.js";
import { preferCsvCollectionFormatRule } from "./rules/prefer-csv-collection-format.js";
import { preventFormatUse } from "./rules/prevent-format.js";
import { preventMultipleDiscriminator } from "./rules/prevent-multiple-discriminator.js";
import { preventRestLibraryInterfaces } from "./rules/prevent-rest-library.js";
import { preventUnknownType } from "./rules/prevent-unknown.js";
import { propertyNameRule } from "./rules/property-naming.js";
import { recordTypeRule } from "./rules/record-types.js";
import { bodyArrayRule } from "./rules/request-body-array.js";
import { requireDocumentation } from "./rules/require-docs.js";
import { requireKeyVisibility } from "./rules/require-key-visibility.js";
import { responseSchemaMultiStatusCodeRule } from "./rules/response-schema-multi-status-code.js";
import { rpcOperationRequestBodyRule } from "./rules/rpc-operation-request-body.js";
import { spreadDiscriminatedModelRule } from "./rules/spread-discriminated-model.js";
import { useStandardNames } from "./rules/use-standard-names.js";
import { useStandardOperations } from "./rules/use-standard-ops.js";

export const $linter = defineLinter({
  rules: [
    apiVersionRule,
    authRequiredRule,
    operationIdRule,
    bodyArrayRule,
    byosRule,
    casingRule,
    spreadDiscriminatedModelRule,
    compositionOverInheritanceRule,
    preferCsvCollectionFormatRule,
    extensibleEnumRule,
    knownEncodingRule,
    useStandardOperations,
    noClosedLiteralUnionRule,
    noEnumRule,
    noErrorStatusCodesRule,
    noFixedEnumDiscriminatorRule,
    noNullableRule,
    noOffsetDateTimeRule,
    noRpcPathParamsRule,
    noExplicitRoutesResourceOps,
    noResponseBodyRule,
    preventFormatUse,
    preventMultipleDiscriminator,
    preventRestLibraryInterfaces,
    preventUnknownType,
    recordTypeRule,
    responseSchemaMultiStatusCodeRule,
    propertyNameRule,
    rpcOperationRequestBodyRule,
    requireDocumentation,
    requireKeyVisibility,
    longRunningOperationsRequirePollingOperation,
    useStandardNames,
  ],
  ruleSets: {
    all: {
      enable: {
        [`@azure-tools/typespec-azure-core/${apiVersionRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${authRequiredRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${operationIdRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${bodyArrayRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${byosRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${casingRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${compositionOverInheritanceRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${spreadDiscriminatedModelRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${preferCsvCollectionFormatRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${extensibleEnumRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${knownEncodingRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${useStandardOperations.name}`]: true,
        [`@azure-tools/typespec-azure-core/${noErrorStatusCodesRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${noFixedEnumDiscriminatorRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${noNullableRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${noOffsetDateTimeRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${noRpcPathParamsRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${noExplicitRoutesResourceOps.name}`]: true,
        [`@azure-tools/typespec-azure-core/${noResponseBodyRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${preventFormatUse.name}`]: true,
        [`@azure-tools/typespec-azure-core/${preventMultipleDiscriminator.name}`]: true,
        [`@azure-tools/typespec-azure-core/${preventRestLibraryInterfaces.name}`]: true,
        [`@azure-tools/typespec-azure-core/${preventUnknownType.name}`]: true,
        [`@azure-tools/typespec-azure-core/${recordTypeRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${responseSchemaMultiStatusCodeRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${propertyNameRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${rpcOperationRequestBodyRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${requireDocumentation.name}`]: true,
        [`@azure-tools/typespec-azure-core/${requireKeyVisibility.name}`]: true,
        [`@azure-tools/typespec-azure-core/${longRunningOperationsRequirePollingOperation.name}`]:
          true,
        [`@azure-tools/typespec-azure-core/${useStandardNames.name}`]: true,
        [`@azure-tools/typespec-azure-core/${friendlyNameRule.name}`]: true,
        [`@azure-tools/typespec-azure-core/${noEnumRule.name}`]: false,
      },
      extends: ["@typespec/http/all"],
    },
  },
});
