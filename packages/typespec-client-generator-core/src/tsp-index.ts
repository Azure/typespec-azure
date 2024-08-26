import { AzureClientGeneratorCoreDecorators } from "../generated-defs/Azure.ClientGenerator.Core.js";
import {
  $access,
  $client,
  $clientFormat,
  $clientName,
  $convenientAPI,
  $exclude,
  $flattenProperty,
  $include,
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
    // eslint-disable-next-line deprecation/deprecation
    exclude: $exclude,
    // eslint-disable-next-line deprecation/deprecation
    include: $include,
    // eslint-disable-next-line deprecation/deprecation
    clientFormat: $clientFormat,
    usage: $usage,
    access: $access,
    // eslint-disable-next-line deprecation/deprecation
    flattenProperty: $flattenProperty,
    override: $override,
    useSystemTextJsonConverter: $useSystemTextJsonConverter,
  } as AzureClientGeneratorCoreDecorators,
};
