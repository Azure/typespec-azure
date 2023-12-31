import { Operation, createRule } from "@typespec/compiler";
import { isExcludedCoreType } from "./utils.js";

export const operationIdRule = createRule({
  name: "no-operation-id",
  description:
    "Operation ID is automatically generated by the OpenAPI emitters and should not normally be specified.",
  severity: "warning",
  messages: {
    default:
      "Operation ID is automatically generated by the OpenAPI emitters and should not normally be specified.",
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (isExcludedCoreType(context.program, operation)) return;
        for (const dec of operation.decorators) {
          // See issue https://github.com/microsoft/typespec/issues/1943 for more precise
          if (dec.decorator.name === "$operationId") {
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
