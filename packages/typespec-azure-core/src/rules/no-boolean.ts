import type { Type } from "@typespec/compiler";
import { createRule, fileRef } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const noBooleanRule = createRule({
  name: "no-boolean",
  docs: fileRef.fromPackageRoot("src/rules/no-boolean.md"),
  description:
    "Boolean properties should use descriptive extensible enums when semantic values matter.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-boolean",
  messages: {
    default:
      "Consider using an extensible enum instead of a boolean property so the API shape is more descriptive.",
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
