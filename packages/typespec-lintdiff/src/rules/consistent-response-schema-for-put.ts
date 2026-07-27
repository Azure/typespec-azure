import { createRule, type Type } from "@typespec/compiler";
import { getHttpOperation, type HttpOperationResponse } from "@typespec/http";
import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";

export const consistentResponseSchemaForPutRule = createRule({
  name: "consistent-response-schema-for-put",
  description: "ARM PUT operations must return the same schema for 200 and 201 responses.",
  severity: "warning",
  messages: {
    default:
      "200 response schema does not match 201 response schema. A PUT API must always return the same response schema for both the 200 and 201 status codes.",
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (resolveProviderNamespace(context.program, namespace) === undefined) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "put") {
          return;
        }

        const response200 = httpOperation.responses.find((response) => response.statusCodes === 200);
        const response201 = httpOperation.responses.find((response) => response.statusCodes === 201);
        if (response200 === undefined || response201 === undefined) {
          return;
        }

        const response200Body = getResponseBodyType(response200);
        const response201Body = getResponseBodyType(response201);
        if (
          response200Body === undefined ||
          response201Body === undefined ||
          response200Body === response201Body
        ) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
        });
      },
    };
  },
});

function getResponseBodyType(response: HttpOperationResponse): Type | undefined {
  return response.responses.find((content) => content.body !== undefined)?.body?.type;
}
