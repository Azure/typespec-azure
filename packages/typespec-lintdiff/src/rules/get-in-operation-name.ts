import { createRule, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const getInOperationNameRule = createRule({
  name: "get-in-operation-name",
  description:
    "GET operations should use 'get' or 'List' as the operation name prefix.",
  severity: "warning",
  messages: {
    default: paramMessage`'GET' operation '${"operationName"}' should use method name 'get' or method name starting with 'List'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "get") {
          return;
        }

        const name = operation.name.toLowerCase();
        if (name.startsWith("get") || name.startsWith("list")) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
          format: { operationName: operation.name },
        });
      },
    };
  },
});
