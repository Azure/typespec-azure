import {
  createRule,
  fileRef,
  isTemplateDeclarationOrInstance,
  type Operation,
} from "@typespec/compiler";
import { getResponsesForOperation } from "@typespec/http";
import { hasDefaultResponse, missingDefaultResponseReported } from "./http-response-utils.js";
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
    const missing = new Set<Operation>();
    const reported = context.program.stateSet(missingDefaultResponseReported);
    reported.clear();

    return {
      operation(operation) {
        if (
          isTemplateDeclarationOrInstance(operation) ||
          isTemplatedInterfaceOperation(operation)
        ) {
          return;
        }

        const [responses] = getResponsesForOperation(context.program, operation);
        if (!hasDefaultResponse(responses)) {
          missing.add(operation);
        }
      },
      exit() {
        // Existing response checks run on both root and operation listeners.
        for (const operation of missing) {
          if (!reported.has(operation)) {
            context.reportDiagnostic({ target: operation });
          }
        }
      },
    };
  },
});
