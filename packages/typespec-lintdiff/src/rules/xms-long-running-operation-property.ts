import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { getArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { createRule, listServices, type ModelProperty, type Operation } from "@typespec/compiler";
import { getHttpService, type HttpOperationResponse } from "@typespec/http";

const qualifyingStatusCodes = [200, 201, 202, 204];
const qualifyingHeaders = new Set(["location", "azure-asyncoperation"]);
const qualifyingVerbs = new Set(["put", "patch", "post", "delete"]);

export const xmsLongRunningOperationPropertyRule = createRule({
  name: "xms-long-running-operation-property",
  description:
    "ARM PUT/PATCH/POST/DELETE operations with Location or Azure-AsyncOperation response headers must be marked as long-running.",
  severity: "warning",
  messages: {
    default:
      "ARM operations with Location or Azure-AsyncOperation response headers must have native polling metadata. Use an asynchronous ARM template or supported semantic LRO headers.",
  },
  create(context) {
    return {
      root() {
        const visitedOperations = new Set<Operation>();
        for (const service of listServices(context.program)) {
          // Lintdiff enables mixed ARM/data-plane rules; remove this isolation on ARM promotion.
          if (!getArmProviderNamespace(context.program, service.type)) {
            continue;
          }
          const [httpService] = getHttpService(context.program, service.type);
          for (const httpOperation of httpService.operations) {
            const operation = httpOperation.operation;
            if (!qualifyingVerbs.has(httpOperation.verb) || visitedOperations.has(operation)) {
              continue;
            }
            visitedOperations.add(operation);
            const target = getFirstQualifyingHeaderTarget(httpOperation.responses);
            if (target && getLroMetadata(context.program, operation) === undefined) {
              context.reportDiagnostic({ target });
            }
          }
        }
      },
    };
  },
});

function getFirstQualifyingHeaderTarget(
  responses: HttpOperationResponse[],
): ModelProperty | undefined {
  for (const statusCode of qualifyingStatusCodes) {
    for (const response of responses) {
      if (response.statusCodes !== statusCode) {
        continue;
      }

      for (const content of response.responses) {
        const headers = content.headers ?? {};
        for (const [headerName, property] of Object.entries(headers)) {
          if (qualifyingHeaders.has(headerName.toLowerCase())) {
            return property;
          }
        }
      }
    }
  }

  return undefined;
}
