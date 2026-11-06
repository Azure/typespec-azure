import { createRule, fileRef, isTemplateInstance, isVoidType } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { isTemplatedInterfaceOperation } from "./utils.js";

export const noGetRequestBodyRule = createRule({
  name: "no-get-request-body",
  docs: fileRef.fromPackageRoot("src/rules/no-get-request-body.md"),
  description: "GET operations must not have a request body.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-get-request-body",
  messages: {
    default: "GET operations must not have a request body. Remove the request body.",
  },
  create(context) {
    return {
      operation: (operation) => {
        if (isTemplateInstance(operation) || isTemplatedInterfaceOperation(operation)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        const body = httpOperation.parameters.body;
        if (httpOperation.verb !== "get" || body === undefined || isVoidType(body.type)) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
        });
      },
    };
  },
});
