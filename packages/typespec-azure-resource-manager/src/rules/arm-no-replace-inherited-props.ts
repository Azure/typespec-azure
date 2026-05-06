import { createRule, getDiscriminator, Model, paramMessage } from "@typespec/compiler";

import { getArmResource } from "../resource.js";

export const armNoReplaceInheritedPropsRule = createRule({
  name: "arm-no-replace-inherited-props",
  severity: "warning",
  description: "Disallow redefining properties already defined in a base type.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-no-replace-inherited-props",
  messages: {
    default: paramMessage`The property '${"propertyName"}' is also defined in the base model.  Redefining inherited properties can cause problems with OpenAPI tooling and some language representations of the models.`,
  },
  create(context) {
    return {
      model: (model: Model) => {
        if (model.baseModel === undefined) return;

        // Collect discriminator property names from any ancestor model with `@discriminator`.
        const discriminatorProps = new Set<string>();
        let ancestor: Model | undefined = model.baseModel;
        while (ancestor !== undefined) {
          const discriminator = getDiscriminator(context.program, ancestor);
          if (discriminator !== undefined) {
            discriminatorProps.add(discriminator.propertyName);
          }
          ancestor = ancestor.baseModel;
        }

        const isArmResource = getArmResource(context.program, model) !== undefined;

        for (const property of model.properties.values()) {
          // Skip the 'name' property of any ARM resource.
          if (isArmResource && property.name === "name") continue;

          // Skip discriminator properties redefined in derived models.
          if (discriminatorProps.has(property.name)) continue;

          // Look up the chain of base models for a property with the same name.
          let baseHasProperty = false;
          let current: Model | undefined = model.baseModel;
          while (current !== undefined) {
            if (current.properties.has(property.name)) {
              baseHasProperty = true;
              break;
            }
            current = current.baseModel;
          }

          if (baseHasProperty) {
            context.reportDiagnostic({
              format: { propertyName: property.name },
              target: property,
            });
          }
        }
      },
    };
  },
});
