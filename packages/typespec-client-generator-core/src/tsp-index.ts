import { AzureClientGeneratorCoreDecorators } from "../generated-defs/Azure.ClientGenerator.Core.js";
import {
  $access,
  $client,
  $clientInitialization,
  $clientName,
  $clientNamespace,
  $convenientAPI,
  $flattenProperty,
  $isApiVersion,
  $operationGroup,
  $override,
  $paramAlias,
  $protocolAPI,
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
    flattenProperty: $flattenProperty,
    override: $override,
    useSystemTextJsonConverter: $useSystemTextJsonConverter,
    clientInitialization: $clientInitialization,
    paramAlias: $paramAlias,
    isApiVersion: $isApiVersion,
    clientNamespace: $clientNamespace,
  } as AzureClientGeneratorCoreDecorators,
};
