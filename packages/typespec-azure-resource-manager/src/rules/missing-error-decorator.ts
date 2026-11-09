import {
  createRule,
  fileRef,
  isErrorModel,
  isTemplateDeclarationOrInstance,
  paramMessage,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { matchesStatusCode } from "./http-response-utils.js";
import { isTemplatedInterfaceOperation } from "./utils.js";

export const missingErrorDecoratorRule = createRule({
  name: "missing-error-decorator",
  description: "Require @error on 4xx and 5xx response models, except HEAD 404 responses.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/missing-error-decorator",
  docs: fileRef.fromPackageRoot("src/rules/missing-error-decorator.md"),
  messages: {
    default: paramMessage`Response status '${"statusCode"}' must use a response model marked with @error.`,
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
        for (const response of httpOperation.responses) {
          const status = response.statusCodes;
          if (
            status === "*" ||
            isErrorModel(context.program, response.type) ||
            (httpOperation.verb === "head" && matchesStatusCode(status, 404))
          ) {
            continue;
          }

          const start = typeof status === "number" ? status : status.start;
          const end = typeof status === "number" ? status : status.end;
          if (start <= 599 && end >= 400) {
            context.reportDiagnostic({
              target: operation,
              format: { statusCode: start === end ? String(start) : `${start}-${end}` },
            });
          }
        }
      },
    };
  },
});
