import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { createRule, paramMessage, type Operation, type Program } from "@typespec/compiler";
import { getHttpOperation, type HttpOperationResponse } from "@typespec/http";
import { getExtensions } from "@typespec/openapi";

const qualifyingVerbs = new Set(["put", "patch", "post", "delete"]);

export const lroExtensionRule = createRule({
  name: "lro-extension",
  description:
    "ARM PUT/PATCH/POST/DELETE operations with a 202 response must be marked as long-running.",
  severity: "warning",
  messages: {
    default:
      paramMessage`ARM ${"verb"} operations with a 202 response must set \`x-ms-long-running-operation\` to \`true\`.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (resolveProviderNamespace(context.program, namespace) === undefined) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (!qualifyingVerbs.has(httpOperation.verb) || !has202Response(httpOperation.responses)) {
          return;
        }

        if (isMarkedLongRunning(context.program, operation)) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
          format: {
            verb: httpOperation.verb.toUpperCase(),
          },
        });
      },
    };
  },
});

function isMarkedLongRunning(program: Program, operation: Operation): boolean {
  return (
    getLroMetadata(program, operation) !== undefined ||
    getExtensions(program, operation).get("x-ms-long-running-operation") === true
  );
}

function has202Response(responses: HttpOperationResponse[]): boolean {
  return responses.some((response) => response.statusCodes === 202);
}
