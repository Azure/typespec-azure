import { AzureClientGeneratorCoreDecorators } from "../generated-defs/Azure.ClientGenerator.Core.js";
import {
  $access,
  $client,
  $clientName,
  $convenientAPI,
  $flattenProperty,
  $operationGroup,
  $override,
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
    // eslint-disable-next-line deprecation/deprecation
    flattenProperty: $flattenProperty,
    override: $override,
    useSystemTextJsonConverter: $useSystemTextJsonConverter,
  } as AzureClientGeneratorCoreDecorators,
};
