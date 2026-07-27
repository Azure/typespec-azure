import { createRule, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const putInOperationNameRule = createRule({
  name: "put-in-operation-name",
  description:
    "PUT operations should use 'create' as the operation name prefix.",
  severity: "warning",
  messages: {
    default: paramMessage`'PUT' operation '${"operationName"}' should use method name 'create'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "put") {
          return;
        }

        const name = operation.name.toLowerCase();
        if (name.startsWith("create")) {
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
