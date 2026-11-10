import { createRule, fileRef, isTemplateDeclarationOrInstance } from "@typespec/compiler";
import { getResponsesForOperation } from "@typespec/http";
import { isTemplatedInterfaceOperation } from "./utils.js";

export const missingDefaultResponseRule = createRule({
  name: "missing-default-response",
  docs: fileRef.fromPackageRoot("src/rules/missing-default-response.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/missing-default-response",
  description: "ARM operations must define a default response.",
  severity: "warning",
  messages: {
    default: "Operation is missing a default response. Include the standard ARM ErrorResponse.",
  },
  create(context) {
    return {
      operation(operation) {
        if (
          isTemplateDeclarationOrInstance(operation) ||
          isTemplatedInterfaceOperation(operation)
        ) {
          return;
        }

        const [responses] = getResponsesForOperation(context.program, operation);
        if (!responses.some((response) => response.statusCodes === "*")) {
          context.reportDiagnostic({ target: operation });
        }
      },
    };
  },
});
