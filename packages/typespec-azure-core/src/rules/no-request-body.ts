import {
  createRule,
  fileRef,
  isTemplateInstance,
  isVoidType,
  paramMessage,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { isTemplatedInterfaceOperation } from "./utils.js";

export const noRequestBodyRule = createRule({
  name: "no-request-body",
  docs: fileRef.fromPackageRoot("src/rules/no-request-body.md"),
  description: "GET and DELETE operations must not have a request body.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-request-body",
  messages: {
    default: paramMessage`${"verb"} operations must not have a request body. Remove the request body.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        if (isTemplateInstance(operation) || isTemplatedInterfaceOperation(operation)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        const body = httpOperation.parameters.body;
        if (
          (httpOperation.verb !== "get" && httpOperation.verb !== "delete") ||
          body === undefined ||
          isVoidType(body.type)
        ) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
          format: { verb: httpOperation.verb.toUpperCase() },
        });
      },
    };
  },
});
