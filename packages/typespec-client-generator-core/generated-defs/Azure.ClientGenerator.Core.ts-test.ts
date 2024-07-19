/** An error here would mean that the decorator is not exported or doesn't have the right name. */
import {
  $access,
  $client,
  $clientFormat,
  $clientName,
  $convenientAPI,
  $exclude,
  $flattenProperty,
  $include,
  $internal,
  $operationGroup,
  $overrideClientMethod,
  $protocolAPI,
  $usage,
} from "@azure-tools/typespec-client-generator-core";
import type {
  AccessDecorator,
  ClientDecorator,
  ClientFormatDecorator,
  ClientNameDecorator,
  ConvenientAPIDecorator,
  ExcludeDecorator,
  FlattenPropertyDecorator,
  IncludeDecorator,
  InternalDecorator,
  OperationGroupDecorator,
  OverrideClientMethodDecorator,
  ProtocolAPIDecorator,
  UsageDecorator,
} from "./Azure.ClientGenerator.Core.js";

type Decorators = {
  $clientName: ClientNameDecorator;
  $convenientAPI: ConvenientAPIDecorator;
  $protocolAPI: ProtocolAPIDecorator;
  $client: ClientDecorator;
  $operationGroup: OperationGroupDecorator;
  $exclude: ExcludeDecorator;
  $include: IncludeDecorator;
  $clientFormat: ClientFormatDecorator;
  $internal: InternalDecorator;
  $usage: UsageDecorator;
  $access: AccessDecorator;
  $flattenProperty: FlattenPropertyDecorator;
  $overrideClientMethod: OverrideClientMethodDecorator;
};

/** An error here would mean that the exported decorator is not using the same signature. Make sure to have export const $decName: DecNameDecorator = (...) => ... */
const _: Decorators = {
  $clientName,
  $convenientAPI,
  $protocolAPI,
  $client,
  $operationGroup,
  $exclude,
  $include,
  $clientFormat,
  $internal,
  $usage,
  $access,
  $flattenProperty,
  $overrideClientMethod,
};
