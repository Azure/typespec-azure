import { createRule, type ModelProperty, type Operation } from "@typespec/compiler";
import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation } from "@typespec/http";

export const requestBodyNotAllowedRule = createRule({
  name: "request-body-not-allowed",
  description: "Data-plane GET and DELETE operations must not declare a request body.",
  severity: "warning",
  messages: {
    default: "GET and DELETE operations must not accept a request body.",
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (resolveProviderNamespace(context.program, namespace) !== undefined) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "get" && httpOperation.verb !== "delete") {
          return;
        }

        if (httpOperation.parameters.body === undefined) {
          return;
        }

        context.reportDiagnostic({
          target: getDiagnosticTarget(operation, httpOperation),
        });
      },
    };
  },
});

function getDiagnosticTarget(
  operation: Operation,
  httpOperation: ReturnType<typeof getHttpOperation>[0],
): ModelProperty | Operation {
  const body = httpOperation.parameters.body;
  if (body === undefined) {
    return operation;
  }

  if (body.contentTypeProperty !== undefined) {
    return body.contentTypeProperty;
  }

  if ("property" in body && body.property !== undefined) {
    return body.property;
  }

  return operation;
}
