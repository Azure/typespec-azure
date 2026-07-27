import { createRule, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const deleteInOperationNameRule = createRule({
  name: "delete-in-operation-name",
  description:
    "DELETE operations should use 'delete' as the operation name prefix.",
  severity: "warning",
  messages: {
    default: paramMessage`'DELETE' operation '${"operationName"}' should use method name 'delete'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "delete") {
          return;
        }

        const name = operation.name.toLowerCase();
        if (name.startsWith("delete")) {
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
