import { Model, createRule, getDiscriminator, paramMessage } from "@typespec/compiler";
import { isFixed } from "../decorators.js";

export const noFixedEnumDiscriminatorRule = createRule({
  name: "no-fixed-enum-discriminator",
  description: "Discriminator shouldn't be a fixed enum.",
  severity: "warning",
  messages: {
    default: paramMessage`Discriminator shouldn't be a fixed enum. A discriminated model is likely to expand over time. Removed "@fixed" from "${"enumName"}" enum.`,
  },
  create(context) {
    return {
      model: (model: Model) => {
        const discriminator = getDiscriminator(context.program, model);
        if (discriminator === undefined) {
          return;
        }

        const property = model.properties.get(discriminator.propertyName);
        if (property === undefined || property.type.kind !== "Enum") {
          return;
        }

        if (isFixed(context.program, property.type)) {
          context.reportDiagnostic({
            format: { enumName: property.type.name },
            target: property,
          });
        }
      },
    };
  },
});
