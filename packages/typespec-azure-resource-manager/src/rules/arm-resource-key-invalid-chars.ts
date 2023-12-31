import { Model, ModelProperty, createRule, getKeyName, paramMessage } from "@typespec/compiler";

import { getDecoratorParam, isInternalTypeSpec, isResource, isValidKey } from "./utils.js";

export const armResourceKeyInvalidCharsRule = createRule({
  name: "arm-resource-key-invalid-chars",
  severity: "warning",
  description: "Arm resource key must contain only alphanumeric characters.",
  messages: {
    default: paramMessage`'${"key"}' is an invalid path parameter name. Parameters must consist of alphanumeric characters starting with a lower case letter.`,
  },
  create(context) {
    return {
      model: (model: Model) => {
        if (
          !isInternalTypeSpec(context.program, model) &&
          isResource(model) &&
          model.properties.has("name")
        ) {
          const nameProperty: ModelProperty = model.properties.get("name")!;
          const key = getKeyName(context.program, nameProperty);

          if (key !== undefined && !isValidKey(key)) {
            context.reportDiagnostic({
              format: { key: key },
              target: getDecoratorParam(nameProperty, "key")?.node ?? nameProperty,
            });
          }
        }
      },
    };
  },
});
