import { createRule, Model, ModelProperty, SemanticNodeListener } from "@typespec/compiler";

export const armPropertiesTypeObjectNoDefinitionRule = createRule({
  name: "arm-properties-type-object-no-definition",
  severity: "warning",
  description:
    "ARM Properties with type:object that don't reference a model definition are not allowed. ARM doesn't allow generic type definitions as this leads to bad customer experience.",
  messages: {
    default: "Properties with type:object must have definition of a reference model.",
    extends:
      "The `type:object` model is not defined in the payload. Define the reference model of the object or change the `type` to a primitive data type like string, int, etc",
  },
  create(context): SemanticNodeListener {
    return {
      model: (model: Model) => {
        for (const property of getProperties(model)) {
          if (property.type.kind === "Model" && !property.type.name) {
            context.reportDiagnostic({
              code: "arm-no-record",
              target: model,
            });
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
