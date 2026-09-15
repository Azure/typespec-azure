import { defineLinter } from "@typespec/compiler";
import { deleteInOperationNameRule } from "./rules/delete-in-operation-name.js";
import { getInOperationNameRule } from "./rules/get-in-operation-name.js";
import { listInOperationNameRule } from "./rules/list-in-operation-name.js";
import { patchInOperationNameRule } from "./rules/patch-in-operation-name.js";
import { putInOperationNameRule } from "./rules/put-in-operation-name.js";
import { descriptionMustNotBeNodeNameRule } from "./rules/description-must-not-be-node-name.js";
import { descriptiveDescriptionRequiredRule } from "./rules/descriptive-description-required.js";
import { securityDefinitionDescriptionRule } from "./rules/security-definition-description.js";
import { summaryAndDescriptionMustNotBeSameRule } from "./rules/summary-and-description-must-not-be-same.js";
import { allResourcesMustHaveGetOperationRule } from "./rules/all-resources-must-have-get-operation.js";
import { avoidAnonymousParameterRule } from "./rules/avoid-anonymous-parameter.js";
import { avoidAnonymousTypesRule } from "./rules/avoid-anonymous-types.js";
import { collectionObjectPropertiesNamingRule } from "./rules/collection-object-properties-naming.js";
import { consistentResponseSchemaForPutRule } from "./rules/consistent-response-schema-for-put.js";
import { extensionResourcePathPatternRule } from "./rules/extension-resource-path-pattern.js";
import { evenSegmentedPathForPutOperationRule } from "./rules/even-segmented-path-for-put-operation.js";
import { enumInsteadOfBooleanRule } from "./rules/enum-instead-of-boolean.js";
import { getCollectionOnlyHasValueAndNextLinkRule } from "./rules/get-collection-only-has-value-and-next-link.js";
import { getResponseCodesRule } from "./rules/get-response-codes.js";
import { guidUsageRule } from "./rules/guid-usage.js";
import { implementPrivateEndpointApisRule } from "./rules/implement-private-endpoint-apis.js";
import { latestVersionOfCommonTypesMustBeUsedRule } from "./rules/latest-version-of-common-types-must-be-used.js";
import { longRunningOperationsOptionsValidatorRule } from "./rules/long-running-operations-options-validator.js";
import { lroErrorContentRule } from "./rules/lro-error-content.js";
import { lroExtensionRule } from "./rules/lro-extension.js";
import { noErrorCodeResponsesRule } from "./rules/no-error-code-responses.js";
import { missingXmsErrorResponseRule } from "./rules/missing-xms-error-response.js";
import { mutabilityWithReadOnlyRule } from "./rules/mutability-with-read-only.js";
import { nestedResourcesMustHaveListOperationRule } from "./rules/nested-resources-must-have-list-operation.js";
import { nonApplicationJsonTypeRule } from "./rules/non-application-json-type.js";
import { operationIdNounVerbRule } from "./rules/operation-id-noun-verb.js";
import { parametersSchemaAsTypeObjectRule } from "./rules/parameters-schema-as-type-object.js";
import { parametersInPostRule } from "./rules/parameters-in-post.js";
import { pageableRequires200ResponseRule } from "./rules/pageable-requires-200-response.js";
import { pathCharactersRule } from "./rules/path-characters.js";
import { pathParameterNamesRule } from "./rules/path-parameter-names.js";
import { pathParameterSchemaRule } from "./rules/path-parameter-schema.js";
import { parameterNamesConventionRule } from "./rules/parameter-names-convention.js";
import { paginationResponseRule } from "./rules/pagination-response.js";
import { post201ResponseRule } from "./rules/post-201-response.js";
import { postOperationIdContainsUrlVerbRule } from "./rules/post-operation-id-contains-url-verb.js";
import { putPathRule } from "./rules/put-path.js";
import { putRequestResponseSchemeArmRule } from "./rules/put-request-response-scheme-arm.js";
import { putRequestResponseSchemeRule } from "./rules/put-request-response-scheme.js";
import { previewVersionOverOneYearRule } from "./rules/preview-version-over-one-year.js";
import { queryParametersInCollectionGetRule } from "./rules/query-parameters-in-collection-get.js";
import { requestBodyNotAllowedRule } from "./rules/request-body-not-allowed.js";
import { repeatedPathInfoRule } from "./rules/repeated-path-info.js";
import { requestBodyOptionalRule } from "./rules/request-body-optional.js";
import { patchBodyParametersSchemaRule } from "./rules/patch-body-parameters-schema.js";
import { consistentPatchPropertiesRule } from "./rules/consistent-patch-properties.js";
import { patchPropertiesCorrespondToPutPropertiesRule } from "./rules/patch-properties-correspond-to-put-properties.js";
import { subscriptionsAndResourceGroupCasingRule } from "./rules/subscriptions-and-resource-group-casing.js";
import { tagsAreNotAllowedForProxyResourcesRule } from "./rules/tags-are-not-allowed-for-proxy-resources.js";
import { tenantLevelAPIsNotAllowedRule } from "./rules/tenant-level-apis-not-allowed.js";
import { trackedResourcesMustHavePutRule } from "./rules/tracked-resources-must-have-put.js";
import { unsupportedPatchPropertiesRule } from "./rules/unsupported-patch-properties.js";
import { trackedResourcePatchOperationRule } from "./rules/tracked-resource-patch-operation.js";
import { topLevelResourcesListByResourceGroupRule } from "./rules/top-level-resources-list-by-resource-group.js";
import { validQueryParametersForPointOperationsRule } from "./rules/valid-query-parameters-for-point-operations.js";
import { versionPolicyRule } from "./rules/version-policy.js";
import { xmsExamplesRequiredRule } from "./rules/xms-examples-required.js";
import { xmsLongRunningOperationPropertyRule } from "./rules/xms-long-running-operation-property.js";
import { xmsPageableForListCallsRule } from "./rules/xms-pageable-for-list-calls.js";
import { xmsPageableMustHaveCorrespondingResponseRule } from "./rules/xms-pageable-must-have-corresponding-response.js";
import { xmsResourceInPutResponseRule } from "./rules/xms-resource-in-put-response.js";
import { pathResourceProviderNamePascalCaseRule } from "./rules/path-resource-provider-name-pascal-case.js";

const rules = [
  collectionObjectPropertiesNamingRule,
  avoidAnonymousParameterRule,
  avoidAnonymousTypesRule,
  consistentResponseSchemaForPutRule,
  deleteInOperationNameRule,
  extensionResourcePathPatternRule,
  evenSegmentedPathForPutOperationRule,
  descriptionMustNotBeNodeNameRule,
  enumInsteadOfBooleanRule,
  getCollectionOnlyHasValueAndNextLinkRule,
  getInOperationNameRule,
  guidUsageRule,
  implementPrivateEndpointApisRule,
  allResourcesMustHaveGetOperationRule,
  getResponseCodesRule,
  latestVersionOfCommonTypesMustBeUsedRule,
  listInOperationNameRule,
  longRunningOperationsOptionsValidatorRule,
  lroErrorContentRule,
  lroExtensionRule,
  missingXmsErrorResponseRule,
  descriptiveDescriptionRequiredRule,
  securityDefinitionDescriptionRule,
  summaryAndDescriptionMustNotBeSameRule,
  subscriptionsAndResourceGroupCasingRule,
  tagsAreNotAllowedForProxyResourcesRule,
  mutabilityWithReadOnlyRule,
  nestedResourcesMustHaveListOperationRule,
  nonApplicationJsonTypeRule,
  noErrorCodeResponsesRule,
  operationIdNounVerbRule,
  patchInOperationNameRule,
  pageableRequires200ResponseRule,
  parametersSchemaAsTypeObjectRule,
  parametersInPostRule,
  paginationResponseRule,
  post201ResponseRule,
  postOperationIdContainsUrlVerbRule,
  putInOperationNameRule,
  putPathRule,
  putRequestResponseSchemeRule,
  putRequestResponseSchemeArmRule,
  pathCharactersRule,
  pathParameterNamesRule,
  pathParameterSchemaRule,
  parameterNamesConventionRule,
  previewVersionOverOneYearRule,
  queryParametersInCollectionGetRule,
  requestBodyNotAllowedRule,
  repeatedPathInfoRule,
  requestBodyOptionalRule,
  patchBodyParametersSchemaRule,
  consistentPatchPropertiesRule,
  patchPropertiesCorrespondToPutPropertiesRule,
  tenantLevelAPIsNotAllowedRule,
  trackedResourcesMustHavePutRule,
  unsupportedPatchPropertiesRule,
  trackedResourcePatchOperationRule,
  topLevelResourcesListByResourceGroupRule,
  validQueryParametersForPointOperationsRule,
  versionPolicyRule,
  xmsExamplesRequiredRule,
  xmsLongRunningOperationPropertyRule,
  xmsPageableForListCallsRule,
  xmsPageableMustHaveCorrespondingResponseRule,
  xmsResourceInPutResponseRule,
  pathResourceProviderNamePascalCaseRule,
];

const enabledRules = {
  [`tsp-lintdiff-local-linter/${collectionObjectPropertiesNamingRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${avoidAnonymousParameterRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${avoidAnonymousTypesRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${consistentResponseSchemaForPutRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${deleteInOperationNameRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${extensionResourcePathPatternRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${evenSegmentedPathForPutOperationRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${descriptionMustNotBeNodeNameRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${enumInsteadOfBooleanRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${getCollectionOnlyHasValueAndNextLinkRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${getInOperationNameRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${guidUsageRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${implementPrivateEndpointApisRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${allResourcesMustHaveGetOperationRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${getResponseCodesRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${latestVersionOfCommonTypesMustBeUsedRule.name}`]:
    true,
  [`tsp-lintdiff-local-linter/${listInOperationNameRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${longRunningOperationsOptionsValidatorRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${lroErrorContentRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${lroExtensionRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${missingXmsErrorResponseRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${descriptiveDescriptionRequiredRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${securityDefinitionDescriptionRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${summaryAndDescriptionMustNotBeSameRule.name}`]:
    true,
  [`tsp-lintdiff-local-linter/${subscriptionsAndResourceGroupCasingRule.name}`]:
    true,
  [`tsp-lintdiff-local-linter/${tagsAreNotAllowedForProxyResourcesRule.name}`]:
    true,
  [`tsp-lintdiff-local-linter/${mutabilityWithReadOnlyRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${nestedResourcesMustHaveListOperationRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${nonApplicationJsonTypeRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${noErrorCodeResponsesRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${operationIdNounVerbRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${patchInOperationNameRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${pageableRequires200ResponseRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${parametersSchemaAsTypeObjectRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${parametersInPostRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${paginationResponseRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${post201ResponseRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${postOperationIdContainsUrlVerbRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${putInOperationNameRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${putPathRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${putRequestResponseSchemeRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${putRequestResponseSchemeArmRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${pathCharactersRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${pathParameterNamesRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${pathParameterSchemaRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${parameterNamesConventionRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${previewVersionOverOneYearRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${queryParametersInCollectionGetRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${requestBodyNotAllowedRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${repeatedPathInfoRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${requestBodyOptionalRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${patchBodyParametersSchemaRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${consistentPatchPropertiesRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${patchPropertiesCorrespondToPutPropertiesRule.name}`]:
    true,
  [`tsp-lintdiff-local-linter/${tenantLevelAPIsNotAllowedRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${trackedResourcesMustHavePutRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${unsupportedPatchPropertiesRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${trackedResourcePatchOperationRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${topLevelResourcesListByResourceGroupRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${validQueryParametersForPointOperationsRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${versionPolicyRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${xmsExamplesRequiredRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${xmsLongRunningOperationPropertyRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${xmsPageableForListCallsRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${xmsPageableMustHaveCorrespondingResponseRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${xmsResourceInPutResponseRule.name}`]: true,
  [`tsp-lintdiff-local-linter/${pathResourceProviderNamePascalCaseRule.name}`]: true,
};

export const $linter = defineLinter({
  rules,
  ruleSets: {
    all: {
      enable: enabledRules,
    },
    recommended: {
      enable: enabledRules,
    },
  },
});
