import { createRule, fileRef } from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";

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
    const tk = $(context.program);

    return {
      modelProperty: (property) => {
        if (!tk.scalar.isBoolean(property.type)) {
          return;
        }

        context.reportDiagnostic({
          target: property,
        });
      },
      operation: (operation) => {
        if (tk.scalar.isBoolean(operation.returnType)) {
          context.reportDiagnostic({
            target: operation,
          });
        }
      },
    };
  },
});
