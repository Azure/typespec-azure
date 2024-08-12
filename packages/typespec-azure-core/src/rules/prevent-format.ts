import { ModelProperty, Scalar, createRule } from "@typespec/compiler";

export const preventFormatRule = createRule({
  name: "no-format",
  description: "Azure services should not use the `@format` decorator.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/prevent-format",
  messages: {
    default: "Azure services should not use the `@format` decorator.",
  },
  create(context) {
    return {
      scalar: (scalar: Scalar) => {
        for (const dec of scalar.decorators) {
          if (dec.decorator.name === "$format") {
            context.reportDiagnostic({
              target: dec.node ? dec.node : scalar,
            });
          }
        }
      },
      modelProperty: (model: ModelProperty) => {
        for (const dec of model.decorators) {
          if (dec.decorator.name === "$format") {
            context.reportDiagnostic({
              target: dec.node ? dec.node : model,
            });
          }
        }
      },
    };
  },
});
