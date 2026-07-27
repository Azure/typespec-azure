import { createRule, paramMessage } from "@typespec/compiler";
import { isArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation } from "@typespec/http";
import { comparePutRequestAndResponse } from "./put-request-response-scheme-shared.js";

export const putRequestResponseSchemeArmRule = createRule({
  name: "put-request-response-scheme-arm",
  description:
    "ARM PUT request body schemas must match the 200 response schema, or the 201 response schema when no 200 response exists.",
  severity: "warning",
  messages: {
    default:
      paramMessage`PUT request body schema should match the ${"statusCode"} response schema.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (!isArmProviderNamespace(context.program, namespace)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "put") {
          return;
        }

        const comparison = comparePutRequestAndResponse(httpOperation);
        if (comparison === undefined || comparison.matches) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
          format: {
            statusCode: comparison.statusCode,
          },
        });
      },
    };
  },
});
