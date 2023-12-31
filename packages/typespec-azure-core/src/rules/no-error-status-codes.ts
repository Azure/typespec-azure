import { Operation, createRule, ignoreDiagnostics } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { isAzureSubNamespace, isExcludedCoreType } from "./utils.js";

export const noErrorStatusCodesRule = createRule({
  name: "no-error-status-codes",
  description: "Recommend using the error response defined by Azure REST API guidelines.",
  severity: "warning",
  messages: {
    default:
      "Azure REST API guidelines recommend using 'default' error response for all error cases. Avoid defining custom 4xx or 5xx error cases.",
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (isExcludedCoreType(context.program, operation)) return;
        if (!isAzureSubNamespace(context.program, operation.namespace)) return;

        const httpOperation = ignoreDiagnostics(getHttpOperation(context.program, operation));
        if (httpOperation.responses !== undefined) {
          for (const response of httpOperation.responses) {
            const statusCode = response.statusCodes;
            if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 600) {
              context.reportDiagnostic({
                target: operation,
              });
            }
          }
        }
      },
    };
  },
});
