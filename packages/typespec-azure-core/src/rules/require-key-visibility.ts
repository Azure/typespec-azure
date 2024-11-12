import { Model, createRule, getVisibility, isKey, paramMessage } from "@typespec/compiler";
import { isExcludedCoreType, isInlineModel, isTemplateDeclarationType } from "./utils.js";

export const requireKeyVisibility = createRule({
  name: "key-visibility-required",
  description: "Key properties need to have an explicit visibility setting.",
  severity: "warning",
  messages: {
    default: paramMessage`The key property '${"name"}' does not have an explicit visibility setting, please use the @visibility decorator to set it.`,
  },
  create(context) {
    return {
      model: (model: Model) => {
        if (
          !isTemplateDeclarationType(model) &&
          !isInlineModel(model) &&
          !isExcludedCoreType(context.program, model) &&
          model.name !== "object"
        ) {
          for (const [name, prop] of model.properties) {
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            if (isKey(context.program, prop) && !getVisibility(context.program, prop)) {
              context.reportDiagnostic({
                target: prop,
                format: { name },
              });
            }
          }
        }
      },
    };
  },
});
