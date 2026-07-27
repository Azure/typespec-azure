import { createRule, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const patchInOperationNameRule = createRule({
  name: "patch-in-operation-name",
  description:
    "PATCH operations should use 'update' as the operation name prefix.",
  severity: "warning",
  messages: {
    default: paramMessage`'PATCH' operation '${"operationName"}' should use method name 'update'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "patch") {
          return;
        }

        const name = operation.name.toLowerCase();
        if (name.startsWith("update")) {
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
