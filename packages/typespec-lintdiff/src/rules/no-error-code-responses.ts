import { createRule, paramMessage } from "@typespec/compiler";
import { getHttpOperation, type HttpStatusCodeRange } from "@typespec/http";
import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";

const allowedStatusCodes = new Set<number | "*">([200, 201, 202, 204, "*"]);

export const noErrorCodeResponsesRule = createRule({
  name: "no-error-code-responses",
  description:
    "Operations must not define explicit 4xx/5xx error response codes. Use the default response for error handling.",
  severity: "warning",
  messages: {
    default: paramMessage`Operation '${"operationName"}' defines explicit error status code '${"statusCode"}'. Remove it and use the default response for errors instead.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (resolveProviderNamespace(context.program, namespace) === undefined) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);

        for (const response of httpOperation.responses) {
          if (isExplicitErrorCode(response.statusCodes)) {
            context.reportDiagnostic({
              target: operation,
              format: {
                operationName: operation.name,
                statusCode: formatStatusCode(response.statusCodes),
              },
            });
          }
        }
      },
    };
  },
});

function isExplicitErrorCode(statusCode: number | "*" | HttpStatusCodeRange): boolean {
  if (statusCode === "*") {
    return false;
  }

  if (typeof statusCode === "number") {
    return !allowedStatusCodes.has(statusCode);
  }

  // Range — any range that includes 4xx/5xx codes is an explicit error code
  return statusCode.start >= 400 || statusCode.end >= 400;
}

function formatStatusCode(statusCode: number | "*" | HttpStatusCodeRange): string {
  if (statusCode === "*") {
    return "default";
  }
  if (typeof statusCode === "number") {
    return String(statusCode);
  }
  return statusCode.start === statusCode.end
    ? String(statusCode.start)
    : `${statusCode.start}-${statusCode.end}`;
}
