import { Model, ModelProperty, createRule, getProperty, paramMessage } from "@typespec/compiler";

import { getArmResource } from "../resource.js";

export const armResourceDuplicatePropertiesRule = createRule({
  name: "arm-resource-duplicate-property",
  severity: "warning",
  description: "Warn about duplicate properties in resources.",
  messages: {
    default: paramMessage`Duplicate property "${"propertyName"}" found in the resource envelope and resource properties.  Please do not duplicate envelope properties in resource properties.`,
  },
  create(context) {
    return {
      model: (model: Model) => {
        const resourceModel = getArmResource(context.program, model);
        const reportedDup = new Set<string>();
        if (resourceModel !== undefined) {
          const resourceProperties = getProperty(model, "properties")?.type;
          for (const property of getProperties(model)) {
            if (resourceProperties !== undefined && resourceProperties.kind === "Model") {
              const targetProperty = getProperty(resourceProperties, property.name);
              if (targetProperty !== undefined && !reportedDup.has(property.name)) {
                context.reportDiagnostic({
                  format: { propertyName: property.name },
                  target: targetProperty,
                });
                reportedDup.add(property.name);
              }
            }
          }
        }
      },
    };

    function getProperties(model: Model): ModelProperty[] {
      const result: ModelProperty[] = [];
      let current: Model | undefined = model;
      while (current !== undefined) {
        if (current.properties.size > 0) result.push(...current.properties.values());
        current = current.baseModel;
      }

      return result;
    }
  },
});
