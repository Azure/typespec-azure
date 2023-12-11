import { Enum, createRule, paramMessage } from "@typespec/compiler";

export const noEnumRule = createRule({
  name: "no-enum",
  description: "Azure services should not use enums.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-enum",
  messages: {
    default: paramMessage`Azure services should not use the enum keyword. Extensible enums should be defined as unions with "string" as an accepted variant (ex: \`union Choice { Yes: "yes", No: "no", string };\`).`,
  },
  create(context) {
    return {
      enum: (en: Enum) => {
        context.reportDiagnostic({
          format: { enumName: en.name },
          target: en,
        });
      },
    };
  },
});
