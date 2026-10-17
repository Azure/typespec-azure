import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import {
  createRule,
  fileRef,
  listServices,
  type ModelProperty,
  type Operation,
} from "@typespec/compiler";
import { getHttpService, type HttpOperationResponse } from "@typespec/http";

const qualifyingStatusCodes = [200, 201, 202, 204];
const qualifyingHeaders = new Set(["location", "azure-asyncoperation"]);
const qualifyingVerbs = new Set(["put", "patch", "post", "delete"]);

export const lroMissingPollingMetadataRule = createRule({
  name: "lro-missing-polling-metadata",
  docs: fileRef.fromPackageRoot("src/rules/lro-missing-polling-metadata.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/lro-missing-polling-metadata",
  description: "ARM operations with polling response headers must have native polling metadata.",
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
