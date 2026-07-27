import { createRule } from "@typespec/compiler";
import type { Type } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const enumInsteadOfBooleanRule = createRule({
  name: "enum-instead-of-boolean",
  description:
    "Boolean model properties should be modeled as enums when semantic values matter.",
  severity: "warning",
  messages: {
    default:
      "Consider using an enum instead of a boolean property so the API shape is more descriptive.",
  },
  create(context) {
    return {
      modelProperty: (property) => {
        if (!isBooleanScalar(property)) {
          return;
        }

        context.reportDiagnostic({
          target: property,
        });
      },
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);

        for (const response of httpOperation.responses) {
          if (isBooleanScalar(response.type)) {
            context.reportDiagnostic({
              target: operation,
            });
            continue;
          }

          for (const content of response.responses) {
            if (content.body === undefined || !isBooleanScalar(content.body.type)) {
              continue;
            }

            context.reportDiagnostic({
              target: content.body.property ?? operation,
            });
          }
        }
      },
    };
  },
});

function isBooleanScalar(type: Type): boolean {
  return type.kind === "ModelProperty"
    ? isBooleanScalar(type.type)
    : type.kind === "Scalar" && type.name === "boolean";
}
