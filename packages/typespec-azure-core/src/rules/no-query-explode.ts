import { createRule, Operation } from "@typespec/compiler";
import { getCachedHttpOperation } from "./utils.js";

export const noQueryExplodeRule = createRule({
  name: "no-query-explode",
  description: "It is recommended to serialize query parameter without explode: true",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-query-explode",
  messages: {
    default: `It is preferred to not use explode: true for query parameters`,
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        const httpOperation = getCachedHttpOperation(context.program, operation);
        for (const prop of httpOperation.parameters.properties.filter((x) => x.kind === "query")) {
          if (prop.options.explode === true) {
            context.reportDiagnostic({
              target: prop.property,
            });
          }
        }
      },
    };
  },
});
