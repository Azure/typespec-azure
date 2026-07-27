import {
  createRule,
  isErrorModel,
  paramMessage,
  type DiagnosticTarget,
  type Operation,
  type Type,
} from "@typespec/compiler";
import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation, type HttpOperationResponse, type HttpStatusCodeRange } from "@typespec/http";

export const missingXmsErrorResponseRule = createRule({
  name: "missing-xms-error-response",
  description:
    "ARM 4xx/5xx responses, except HEAD 404, must be marked with @error so the emitter generates x-ms-error-response: true.",
  severity: "warning",
  messages: {
    default:
      paramMessage`ARM ${"verb"} response ${"statusCode"} must be marked with @error so the emitter generates \`x-ms-error-response: true\`.`,
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
          if (!requiresErrorMarker(httpOperation.verb, response.statusCodes)) {
            continue;
          }

          if (isResponseMarkedAsError(context.program, response.type)) {
            continue;
          }

          context.reportDiagnostic({
            target: getDiagnosticTarget(operation, response.type),
            format: {
              verb: httpOperation.verb.toUpperCase(),
              statusCode: formatStatusCode(response.statusCodes),
            },
          });
        }
      },
    };
  },
});

function isResponseMarkedAsError(program: Parameters<typeof isErrorModel>[0], responseType: Type): boolean {
  return responseType.kind === "Model" && isErrorModel(program, responseType);
}

function getDiagnosticTarget(operation: Operation, responseType: Type): DiagnosticTarget {
  return responseType.kind === "Model" ? responseType : operation;
}

function requiresErrorMarker(
  verb: string,
  statusCode: number | "*" | HttpStatusCodeRange,
): boolean {
  if (statusCode === "*") {
    return false;
  }

  if (typeof statusCode === "number") {
    return statusCode >= 400 && statusCode < 600 && !(verb === "head" && statusCode === 404);
  }

  const start = statusCode.start;
  const end = statusCode.end;
  return start >= 400 && end < 600 && !(verb === "head" && start === 404 && end === 404);
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
