import { AzureClientGeneratorCoreDecorators } from "../generated-defs/Azure.ClientGenerator.Core.js";
import { AzureClientGeneratorCoreLegacyDecorators } from "../generated-defs/Azure.ClientGenerator.Core.Legacy.js";
import {
  $access,
  $alternateType,
  $apiVersion,
  $client,
  $clientApiVersions,
  $clientDoc,
  $clientInitialization,
  $clientLocation,
  $clientName,
  $clientNamespace,
  $convenientAPI,
  $deserializeEmptyStringAsNull,
  $flattenProperty,
  $legacyHierarchyBuilding,
  $operationGroup,
  $override,
  $paramAlias,
  $protocolAPI,
  $responseAsBool,
  $scope,
  $usage,
  $useSystemTextJsonConverter,
} from "./decorators.js";

export { $lib } from "./lib.js";
export { $onValidate } from "./validate.js";

/** @internal */
export const $decorators = {
  "Azure.ClientGenerator.Core": {
    clientName: $clientName,
    convenientAPI: $convenientAPI,
    protocolAPI: $protocolAPI,
    client: $client,
    operationGroup: $operationGroup,
    usage: $usage,
    access: $access,
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    flattenProperty: $flattenProperty,
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
  } satisfies AzureClientGeneratorCoreDecorators,

  "Azure.ClientGenerator.Core.Legacy": {
    legacyHierarchyBuilding: $legacyHierarchyBuilding,
  } satisfies AzureClientGeneratorCoreLegacyDecorators,
};
