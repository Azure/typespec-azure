import { createRule, fileRef, getService } from "@typespec/compiler";
import { getHttpOperation, type HttpStatusCodeRange } from "@typespec/http";

const allowedResponseCodes = new Set<number | "*">([200, 202, "*"]);

export const armGetResponseCodesRule = createRule({
  name: "arm-get-operation-response-codes",
  description:
    "ARM GET operations must include a 200 response and may only use 202 and default as additional response codes.",
  docs: fileRef.fromPackageRoot("src/rules/arm-get-operation-response-codes.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-get-operation-response-codes",
  severity: "warning",
  messages: {
    default:
      "GET operations must include a 200 response and may only use 202 and default as additional response codes.",
    empty: "GET operations must declare at least one response and include a 200 response.",
  },
  create(context) {
    return {
      operation: (operation) => {
        let namespace = operation.namespace;
        while (namespace && !getService(context.program, namespace)) {
          namespace = namespace.namespace;
        }
        if (!namespace) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "get") {
          return;
        }

        if (httpOperation.responses.length === 0) {
          context.reportDiagnostic({
            target: operation,
            messageId: "empty",
          });
          return;
        }

        const has200 = httpOperation.responses.some((response) => response.statusCodes === 200);
        const hasOnlyAllowedCodes = httpOperation.responses.every((response) =>
          isAllowedResponseCode(response.statusCodes),
        );

        if (!has200 || !hasOnlyAllowedCodes) {
          context.reportDiagnostic({
            target: operation,
          });
        }
      },
    };
  },
});

function isAllowedResponseCode(statusCode: number | "*" | HttpStatusCodeRange): boolean {
  return typeof statusCode === "number" ? allowedResponseCodes.has(statusCode) : statusCode === "*";
}
