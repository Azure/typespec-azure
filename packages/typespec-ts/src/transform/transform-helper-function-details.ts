import { getHttpOperationWithCache, SdkClient } from "@azure-tools/typespec-client-generator-core";
import { listOperationsUnderRLCClient } from "../utils/client-utils.js";
import { SdkContext } from "../utils/interfaces.js";
import { getCollectionFormat } from "../utils/model-utils.js";
import {
  extractPageDetails,
  getSpecialSerializeInfo,
  hasPagingOperations,
  hasPollingOperations,
} from "../utils/operation-util.js";
import { HelperFunctionDetails } from "../interfaces.js";

export function transformHelperFunctionDetails(
  client: SdkClient,
  dpgContext: SdkContext,
): HelperFunctionDetails {
  const serializeInfo = extractSpecialSerializeInfo(client, dpgContext);

  const annotationDetails = {
    hasLongRunning: hasPollingOperations(client, dpgContext),
  };
  const details = extractClientPageDetails(client, dpgContext);
  return {
    ...(details ?? {}),
    ...annotationDetails,
    ...serializeInfo,
  };
}

function extractClientPageDetails(client: SdkClient, dpgContext: SdkContext) {
  const program = dpgContext.program;
  if (!hasPagingOperations(client, dpgContext)) {
    return;
  }
  const nextLinks = new Set<string>(["nextLink"]);
  const itemNames = new Set<string>(["value"]);
  for (const op of listOperationsUnderRLCClient(client)) {
    const route = getHttpOperationWithCache(dpgContext, op);
    // ignore overload base operation
    if (route.overloads && route.overloads?.length > 0) {
      continue;
    }
    const pagedDetail = extractPageDetails(program, route);
    if (pagedDetail) {
      pagedDetail.itemNames.forEach((name) => itemNames.add(name));
      pagedDetail.nextLinkNames.forEach((name) => nextLinks.add(name));
    }
  }
  // If there are more than one options for nextLink and item names we need to generate a
  // more complex pagination helper.
  return {
    hasPaging: true,
    pageDetails: {
      itemNames: [...itemNames],
      nextLinkNames: [...nextLinks],
      isComplexPaging: nextLinks.size > 1 || itemNames.size > 1,
    },
  };
}

function extractSpecialSerializeInfo(client: SdkClient, dpgContext: SdkContext) {
  let hasMultiCollection = false;
  let hasCsvCollection = false;
  for (const op of listOperationsUnderRLCClient(client)) {
    const route = getHttpOperationWithCache(dpgContext, op);
    route.parameters.parameters.forEach((parameter) => {
      const format = getCollectionFormat(dpgContext, parameter as any);
      const serializeInfo = getSpecialSerializeInfo(dpgContext, parameter.type, format!);
      hasMultiCollection = hasMultiCollection
        ? hasMultiCollection
        : serializeInfo.hasMultiCollection;
      hasCsvCollection = hasCsvCollection ? hasCsvCollection : serializeInfo.hasCsvCollection;
    });
  }
  return {
    hasMultiCollection,
    hasCsvCollection,
  };
}
