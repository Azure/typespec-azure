import { ModelProperty, createRule, paramMessage } from "@typespec/compiler";
import { isExcludedCoreType } from "./utils.js";

export const propertyNameRule = createRule({
  name: "property-name-conflict",
  description: "Avoid naming conflicts between a property and a model of the same name.",
  severity: "warning",
  messages: {
    default: paramMessage`Property '${"propertyName"}' having the same name as its enclosing model will cause problems with C# code generation. Consider renaming the property directly or using the @clientName("newName", "csharp") decorator to rename the property for C#.`,
  },
  create(context) {
    return {
      modelProperty: (property: ModelProperty) => {
        if (isExcludedCoreType(context.program, property)) return;
        const modelName = property.model?.name.toLocaleLowerCase();
        const propertyName = property.name.toLocaleLowerCase();
        if (propertyName === modelName) {
          context.reportDiagnostic({
            format: { propertyName: property.name },
            target: property,
          });
        }
      },
    };
  },
});
