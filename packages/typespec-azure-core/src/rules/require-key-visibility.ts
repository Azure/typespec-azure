import {
  $invisible,
  $removeVisibility,
  $visibility,
  Model,
  createRule,
  isKey,
  paramMessage,
} from "@typespec/compiler";
import { isExcludedCoreType, isInlineModel, isTemplateDeclarationType } from "./utils.js";

const VISIBILITY_DECORATORS = [$visibility, $invisible, $removeVisibility];

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
            const hasExplicitVisibility = prop.decorators.some((dec) =>
              VISIBILITY_DECORATORS.includes(dec.decorator),
            );
            if (isKey(context.program, prop) && !hasExplicitVisibility) {
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
