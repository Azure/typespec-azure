import { ModelProperty, createRule, isUnknownType } from "@typespec/compiler";

export const preventUnknownType = createRule({
  name: "no-unknown",
  description: "Azure services must not have properties of type `unknown`.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-unknown",
  messages: {
    default: "Azure services must not have properties of type `unknown`.",
  },
  create(context) {
    return {
      modelProperty: (modelContext: ModelProperty) => {
        if (isUnknownType(modelContext.type)) {
          context.reportDiagnostic({
            target: modelContext,
          });
        }
      },
    };
  },
});
