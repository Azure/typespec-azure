import { createRule, isTemplateDeclarationOrInstance, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { createAutorestOperationIdResolver } from "./utils/resolve-autorest-operation-id.js";

const validGetOperationId = /^(?:\w+_(?:Get|List)|Get|List)/;

export const getInOperationNameRule = createRule({
  name: "get-in-operation-name",
  description: "GET operationIds should use 'Get' or 'List' as the verb prefix.",
  severity: "warning",
  messages: {
    default: paramMessage`'GET' operation '${"operationId"}' should use method name 'Get' or method name starting with 'List'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
  },
  create(context) {
    const resolveOperationId = createAutorestOperationIdResolver(context.program);

    return {
      operation: (operation) => {
        if (isTemplateDeclarationOrInstance(operation)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "get") {
          return;
        }

        const operationId = resolveOperationId(operation);
        if (operationId.length === 0 || validGetOperationId.test(operationId)) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
          format: { operationId },
        });
      },
    };
  },
});
