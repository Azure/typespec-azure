import { createRule, paramMessage } from "@typespec/compiler";
import { resolveOperationId } from "@typespec/openapi";

export const operationIdNounVerbRule = createRule({
  name: "operation-id-noun-verb",
  description:
    "OperationIds should follow the Noun_Verb convention without repeating the noun after the underscore.",
  severity: "warning",
  messages: {
    default:
      paramMessage`Per the Noun_Verb convention for Operation Ids, the noun '${"noun"}' should not appear after the underscore.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const operationId = resolveOperationId(context.program, operation);
        if (operationId.length === 0 || !operationId.includes("_")) {
          return;
        }

        const [nounPart, verbPart = ""] = operationId.split("_", 2);
        if (nounPart.length === 0 || verbPart.length === 0) {
          return;
        }

        const singularizedNoun =
          nounPart.endsWith("s") && nounPart.length > 1
            ? nounPart.slice(0, -1)
            : undefined;

        if (
          verbPart.includes(nounPart) ||
          (singularizedNoun !== undefined &&
            verbPart.includes(singularizedNoun))
        ) {
          context.reportDiagnostic({
            target: operation,
            format: {
              noun: nounPart,
            },
          });
        }
      },
    };
  },
});
