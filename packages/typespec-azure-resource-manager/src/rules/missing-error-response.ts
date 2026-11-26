import {
  createRule,
  fileRef,
  isErrorModel,
  isTemplateDeclarationOrInstance,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { isTemplatedInterfaceOperation } from "./utils.js";

export const missingErrorResponseRule = createRule({
  name: "missing-error-response",
  docs: fileRef.fromPackageRoot("src/rules/missing-error-response.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/missing-error-response",
  description:
    "ARM operations must include a generic @error response for otherwise undeclared failure status codes.",
  severity: "warning",
  messages: {
    default:
      "Operation is missing an error response for otherwise undeclared failure status codes.",
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

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (
          !httpOperation.responses.some(
            (response) =>
              response.statusCodes === "*" && isErrorModel(context.program, response.type),
          )
        ) {
          context.reportDiagnostic({ target: operation });
        }
      },
    };
  },
});
