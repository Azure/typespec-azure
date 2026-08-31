import type { Type } from "@typespec/compiler";
import { createRule, fileRef } from "@typespec/compiler";

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
        if (isBooleanScalar(operation.returnType)) {
          context.reportDiagnostic({
            target: operation,
          });
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
