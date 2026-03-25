import {
  AzureClientGeneratorCoreDecorators,
  AzureClientGeneratorCoreFunctions,
} from "../generated-defs/Azure.ClientGenerator.Core.js";
import { AzureClientGeneratorCoreLegacyDecorators } from "../generated-defs/Azure.ClientGenerator.Core.Legacy.js";
import {
  $access,
  $alternateType,
  $apiVersion,
  $client,
  $clientApiVersions,
  $clientDefaultValue,
  $clientDoc,
  $clientInitialization,
  $clientLocation,
  $clientName,
  $clientNamespace,
  $clientOption,
  $convenientAPI,
  $deserializeEmptyStringAsNull,
  $disablePageable,
  $flattenProperty,
  $legacyHierarchyBuilding,
  $markAsLro,
  $markAsPageable,
  $nextLinkVerb,
  $operationGroup,
  $override,
  $paramAlias,
  $protocolAPI,
  $responseAsBool,
  $scope,
  $usage,
  $useSystemTextJsonConverter,
} from "./decorators.js";
import { addParameter, removeParameter, reorderParameters, replaceParameter } from "./functions.js";

export { $lib } from "./lib.js";
export { $onValidate } from "./validate.js";

/** @internal */
export const $decorators = {
  "Azure.ClientGenerator.Core": {
    clientName: $clientName,
    convenientAPI: $convenientAPI,
    protocolAPI: $protocolAPI,
    client: $client,
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    operationGroup: $operationGroup,
    usage: $usage,
    access: $access,
    override: $override,
    useSystemTextJsonConverter: $useSystemTextJsonConverter,
    clientInitialization: $clientInitialization,
    paramAlias: $paramAlias,
    apiVersion: $apiVersion,
    clientNamespace: $clientNamespace,
    alternateType: $alternateType,
    scope: $scope,
    clientApiVersions: $clientApiVersions,
    deserializeEmptyStringAsNull: $deserializeEmptyStringAsNull,
    responseAsBool: $responseAsBool,
    clientDoc: $clientDoc,
    clientLocation: $clientLocation,
    clientOption: $clientOption,
  } satisfies AzureClientGeneratorCoreDecorators,

  "Azure.ClientGenerator.Core.Legacy": {
    hierarchyBuilding: $legacyHierarchyBuilding,
    flattenProperty: $flattenProperty,
    markAsLro: $markAsLro,
    markAsPageable: $markAsPageable,
    disablePageable: $disablePageable,
    nextLinkVerb: $nextLinkVerb,
    clientDefaultValue: $clientDefaultValue,
  } satisfies AzureClientGeneratorCoreLegacyDecorators,
};

/** @internal */
export const $functions: Record<string, AzureClientGeneratorCoreFunctions> = {
  // Note: The generated AzureClientGeneratorCoreFunctions type simplifies function signatures.
  // The actual implementation has the full parameter signature required by TypeSpec.
  "Azure.ClientGenerator.Core": {
    replaceParameter: replaceParameter as AzureClientGeneratorCoreFunctions["replaceParameter"],
    removeParameter: removeParameter as AzureClientGeneratorCoreFunctions["removeParameter"],
    addParameter: addParameter as AzureClientGeneratorCoreFunctions["addParameter"],
    reorderParameters: reorderParameters as AzureClientGeneratorCoreFunctions["reorderParameters"],
  },
};
