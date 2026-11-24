import { createRule, fileRef, isTemplateDeclarationOrInstance } from "@typespec/compiler";
import { getResponsesForOperation } from "@typespec/http";
import { isTemplatedInterfaceOperation } from "./utils.js";

export const requireStandardErrorResponseRule = createRule({
  name: "require-standard-error-response",
  docs: fileRef.fromPackageRoot("src/rules/require-standard-error-response.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/require-standard-error-response",
  description: "ARM operations must include a standard error response.",
  severity: "warning",
  messages: {
    default:
      "Operation is missing a standard error response. Include the standard ARM ErrorResponse.",
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
