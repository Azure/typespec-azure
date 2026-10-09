import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import {
  getArmProviderNamespace,
  isArmCollectionAction,
} from "@azure-tools/typespec-azure-resource-manager";
import { createRule, listServices, type Operation } from "@typespec/compiler";
import { getHttpService } from "@typespec/http";

export const lroExtensionRule = createRule({
  name: "lro-extension",
  description:
    "ARM PATCH and provider/collection POST operations returning 202 must have native polling metadata.",
  severity: "warning",
  messages: {
    default:
      "ARM operations returning 202 must have native polling metadata. Use an asynchronous ARM template or preserve supported semantic LRO headers.",
  },
  create(context) {
    return {
      root() {
        const reportedOperations = new Set<Operation>();
        for (const service of listServices(context.program)) {
          // Lintdiff enables mixed ARM/data-plane rules; remove this isolation on ARM promotion.
          if (!getArmProviderNamespace(context.program, service.type)) {
            continue;
          }
          const [httpService] = getHttpService(context.program, service.type);
          for (const httpOperation of httpService.operations) {
            const operation = httpOperation.operation;
            const uncovered =
              httpOperation.verb === "patch" ||
              (httpOperation.verb === "post" && isArmCollectionAction(context.program, operation));
            if (
              uncovered &&
              httpOperation.responses.some((response) => response.statusCodes === 202) &&
              getLroMetadata(context.program, operation) === undefined &&
              !reportedOperations.has(operation)
            ) {
              reportedOperations.add(operation);
              context.reportDiagnostic({ target: operation });
            }
          }
        }
      },
    };
  },
});
