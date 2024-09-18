import { createRule, Model } from "@typespec/compiler";

export const armNoEmptyModel = createRule({
  name: "arm-no-empty-model",
  severity: "warning",
  description:
    "ARM Properties with type:object that don't reference a model definition are not allowed. ARM doesn't allow generic type definitions as this leads to bad customer experience.",
  messages: {
    default: "Properties with type:object must have definition of a reference model.",
    extends:
      "The `type:object` model is not defined in the payload. Define the reference model of the object or change the `type` to a primitive data type like string, int, etc",
  },
  create(context) {
    return {
      model: (model: Model) => {
        if (model.properties.size === 0) {
          context.reportDiagnostic({
            code: "arm-no-empty-model",
            target: model,
          });
        }
      },
    };
  },
});
