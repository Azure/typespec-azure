import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { createRule, fileRef, listServices, type Operation } from "@typespec/compiler";
import { getHttpService, type HttpOperationResponse } from "@typespec/http";
import { isArmCollectionAction } from "../operations.js";

const pollingStatusCodes = new Set([200, 201, 202, 204]);
const pollingHeaders = new Set(["location", "azure-asyncoperation"]);
const pollingVerbs = new Set(["put", "patch", "post", "delete"]);

export const lroMissingPollingMetadataRule = createRule({
  name: "lro-missing-polling-metadata",
  docs: fileRef.fromPackageRoot("src/rules/lro-missing-polling-metadata.md"),
  description:
    "ARM operations indicating asynchronous processing must have native polling metadata.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/lro-missing-polling-metadata",
  messages: {
    default:
      "ARM operations indicating asynchronous processing must have native polling metadata. Use an asynchronous ARM template or preserve supported semantic LRO headers.",
  },
  create(context) {
    return {
      root() {
        const visitedOperations = new Set<Operation>();
        for (const service of listServices(context.program)) {
          const [httpService] = getHttpService(context.program, service.type);
          for (const httpOperation of httpService.operations) {
            const operation = httpOperation.operation;
            if (visitedOperations.has(operation)) {
              continue;
            }
            const requiresAcceptedMetadata =
              httpOperation.verb === "patch" ||
              (httpOperation.verb === "post" && isArmCollectionAction(context.program, operation));
            const hasAcceptedResponse =
              requiresAcceptedMetadata &&
              httpOperation.responses.some((response) => response.statusCodes === 202);
            const hasPollingResponse =
              pollingVerbs.has(httpOperation.verb) && hasPollingHeader(httpOperation.responses);
            if (hasAcceptedResponse || hasPollingResponse) {
              // Metadata resolution can report Core diagnostics even for compliant operations.
              visitedOperations.add(operation);
              if (getLroMetadata(context.program, operation) === undefined) {
                context.reportDiagnostic({ target: operation });
              }
            }
          }
        }
      },
    };
  },
});

function hasPollingHeader(responses: HttpOperationResponse[]): boolean {
  return responses.some(
    (response) =>
      typeof response.statusCodes === "number" &&
      pollingStatusCodes.has(response.statusCodes) &&
      response.responses.some((content) =>
        Object.keys(content.headers ?? {}).some((name) => pollingHeaders.has(name.toLowerCase())),
      ),
  );
}
