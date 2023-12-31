import { Operation, createRule } from "@typespec/compiler";
import { getResourceOperation } from "@typespec/rest";
import { isExcludedCoreType } from "./utils.js";

export const orderByRule = createRule({
  name: "no-order-by",
  description: `List operations with an 'orderBy' parameter are uncommon; support should only be added after large collection sorting performance concerns are considered.`,
  severity: "warning",
  messages: {
    default: `List operations with an 'orderBy' parameter are uncommon; support should only be added after large collection sorting performance concerns are considered.`,
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (isExcludedCoreType(context.program, operation)) return;
        const resOperation = getResourceOperation(context.program, operation);
        for (const param of operation.parameters.properties.values()) {
          if (param.name.toLowerCase() === "orderby" && resOperation?.operation === "list") {
            context.reportDiagnostic({
              format: { operationId: operation.name },
              target: operation,
            });
          }
        }
      },
    };
  },
});
