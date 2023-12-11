import { ModelProperty, createRule, getProjectedNames, paramMessage } from "@typespec/compiler";
import { isExcludedCoreType } from "./utils.js";

export const propertyNameRule = createRule({
  name: "property-name-conflict",
  description: "Avoid naming conflicts.",
  severity: "warning",
  messages: {
    default: paramMessage`Property '${"propertyName"}' having the same name as its enclosing model will cause problems with C# code generation. Consider renaming the property directly or using the @projectedName decorator to rename the property for C#.`,
    projectedName: paramMessage`Use of @projectedName on property '${"propertyName"}' results in '${"propertyName"}' having the same name as its enclosing type in C#. Please use a different @projectedName value.`,
  },
  create(context) {
    return {
      modelProperty: (property: ModelProperty) => {
        if (isExcludedCoreType(context.program, property)) return;
        const projectedNames = getProjectedNames(context.program, property);
        const modelName = property.model?.name.toLocaleLowerCase();
        const propertyName = property.name.toLocaleLowerCase();
        const csharpProjection = projectedNames?.get("csharp")?.toLocaleLowerCase();
        const clientProjection = projectedNames?.get("client")?.toLocaleLowerCase();
        if (
          csharpProjection === modelName || // csharp projection conflicts with model name
          (clientProjection === modelName && !csharpProjection) // client projection conflicts with model name and there is no csharp projection
        ) {
          context.reportDiagnostic({
            messageId: "projectedName",
            format: { propertyName: property.name },
            target: property,
          });
        } else if (propertyName === modelName && !(csharpProjection || clientProjection)) {
          // warning if the property name conflicts with the model name and there is no csharp or client projected name
          context.reportDiagnostic({
            format: { propertyName: property.name },
            target: property,
          });
        }
      },
    };
  },
});
