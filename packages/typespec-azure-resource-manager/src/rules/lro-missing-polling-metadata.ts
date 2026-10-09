import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { createRule, fileRef, listServices, type Operation } from "@typespec/compiler";
import { getHttpService } from "@typespec/http";
import { isArmCollectionAction } from "../operations.js";

export const lroMissingPollingMetadataRule = createRule({
  name: "lro-missing-polling-metadata",
  docs: fileRef.fromPackageRoot("src/rules/lro-missing-polling-metadata.md"),
  description:
    "ARM PATCH and provider/collection POST operations returning 202 must have native polling metadata.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/lro-missing-polling-metadata",
  messages: {
    default:
      "ARM operations returning 202 must have native polling metadata. Use an asynchronous ARM template or preserve supported semantic LRO headers.",
  },
  create(context) {
    return {
      root() {
        const visitedOperations = new Set<Operation>();
        for (const service of listServices(context.program)) {
          const [httpService] = getHttpService(context.program, service.type);
          for (const httpOperation of httpService.operations) {
            const operation = httpOperation.operation;
            const uncovered =
              httpOperation.verb === "patch" ||
              (httpOperation.verb === "post" && isArmCollectionAction(context.program, operation));
            if (
              uncovered &&
              httpOperation.responses.some((response) => response.statusCodes === 202) &&
              !visitedOperations.has(operation)
            ) {
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
