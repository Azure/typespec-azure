import {
  getHttpOperationWithCache,
  SdkClient,
  SdkContext,
} from "@azure-tools/typespec-client-generator-core";
import { listOperationsUnderClient } from "../utils/client-utils.js";
import { getCustomRequestHeaderNameForOperation } from "../utils/operation-util.js";
import { TelemetryInfo } from "../interfaces.js";

export function transformTelemetryInfo(
  client: SdkClient,
  dpgContext: SdkContext,
): TelemetryInfo | undefined {
  const customRequestIdHeaderName = getCustomRequestHeaderNameForClient(dpgContext, client);
  if (customRequestIdHeaderName) {
    return {
      customRequestIdHeaderName,
    };
  }
  return undefined;
}

function getCustomRequestHeaderNameForClient(dpgContext: SdkContext, client: SdkClient) {
  for (const op of listOperationsUnderClient(client)) {
    const headerName = getCustomRequestHeaderNameForOperation(
      getHttpOperationWithCache(dpgContext, op),
    );
    if (headerName !== undefined) {
      return headerName;
    }
  }
  return undefined;
}
