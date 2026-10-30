import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { getArmResources } from "@azure-tools/typespec-azure-resource-manager";
import { createRule, isVoidType } from "@typespec/compiler";

export const noEmptyPostResponseRule = createRule({
  name: "no-empty-post-response",
  description: "Synchronous ARM resource POST responses with status 200 must have a body.",
  severity: "warning",
  messages: {
    default: "A synchronous POST 200 response must have a body. Use 204 for an empty response.",
  },
  create(context) {
    return {
      root() {
        for (const resource of getArmResources(context.program)) {
          const operations = [
            resource.operations.lifecycle.createOrUpdate,
            resource.operations.lifecycle.update,
            ...Object.values(resource.operations.actions),
          ];
          for (const operation of operations) {
            if (
              operation === undefined ||
              operation.httpOperation.verb !== "post" ||
              getLroMetadata(context.program, operation.operation) !== undefined
            ) {
              continue;
            }

            if (
              operation.httpOperation.responses.some(
                (response) =>
                  response.statusCodes === 200 &&
                  response.responses.some(
                    (variant) => variant.body === undefined || isVoidType(variant.body.type),
                  ),
              )
            ) {
              context.reportDiagnostic({ target: operation.operation });
            }
          }
        }
      },
    };
  },
});
