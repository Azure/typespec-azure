import { createRule } from "@typespec/compiler";
import { getHttpOperation, type HttpStatusCodeRange } from "@typespec/http";
import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";

const allowedResponseCodes = new Set<number | "*">([200, 202, "*"]);

export const getResponseCodesRule = createRule({
  name: "get-response-codes",
  description:
    "ARM GET operations must include a 200 response and may only use 202 and default as additional response codes.",
  severity: "warning",
  messages: {
    default:
      "GET operations must include a 200 response and may only use 202 and default as additional response codes.",
    empty:
      "GET operations must declare at least one response and include a 200 response.",
  },
  create(context) {
    return {
      operation: (operation) => {
        if (resolveProviderNamespace(context.program, operation.namespace) === undefined) {
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
  return typeof statusCode === "number"
    ? allowedResponseCodes.has(statusCode)
    : statusCode === "*";
}
