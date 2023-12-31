import { ModelProperty, createRule, isUnknownType } from "@typespec/compiler";

export const preventUnknownType = createRule({
  name: "no-unknown",
  description: "Azure services must not have properties of type `unknown`.",
  severity: "warning",
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
