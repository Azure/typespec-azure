import { ModelProperty, Scalar, createRule } from "@typespec/compiler";
import { isExcludedCoreType } from "./utils.js";

export const preventFormatUse = createRule({
  name: "no-format",
  description: "Azure services should not use the `@format` decorator.",
  severity: "warning",
  messages: {
    default: "Azure services should not use the `@format` decorator.",
  },
  create(context) {
    return {
      scalar: (scalar: Scalar) => {
        if (isExcludedCoreType(context.program, scalar)) {
          return;
        }
        for (const dec of scalar.decorators) {
          if (dec.decorator.name === "$format") {
            context.reportDiagnostic({
              target: dec.node ? dec.node : scalar,
            });
          }
        }
      },
      modelProperty: (model: ModelProperty) => {
        if (isExcludedCoreType(context.program, model)) {
          return;
        }
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
