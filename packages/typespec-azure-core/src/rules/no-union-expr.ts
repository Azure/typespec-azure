import { createRule, paramMessage } from "@typespec/compiler";

export const noUnionExprRule = createRule({
  name: "no-union-expr",
  description: "Azure services should not define union expression but create a declaration.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-union-expr",
  messages: {
    default: paramMessage`Union expression should be defined as a named union declaration.`,
  },
  create(context) {
    return {
      modelProperty: (prop) => {
        const type = prop.type;
        if (type.kind === "Union" && !type.name) {
          context.reportDiagnostic({
            format: { enumName: type.name },
            target: prop,
            codefixes: [],
          });
        }
      },
    };
  },
});
