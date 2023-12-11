import { Model, ModelProperty, createRule, paramMessage } from "@typespec/compiler";

import { getSegment } from "@typespec/rest";
import { getDecoratorParam, isInternalTypeSpec, isResource, isValidKey } from "./utils.js";

export const armResourcePathInvalidCharsRule = createRule({
  name: "arm-resource-path-segment-invalid-chars",
  severity: "warning",
  description: "Arm resource name must contain only alphanumeric characters.",
  messages: {
    default: paramMessage`'${"segment"}' is an invalid path segment. Segments may start with a separator must consist of alphanumeric characters or dashes, starting with a lower case letter.`,
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
          const separator = "/";
          const segment = getSegment(context.program, nameProperty);

          if (segment !== undefined && !isValidPathSegment(segment, separator)) {
            context.reportDiagnostic({
              format: { segment: segment },
              target: getDecoratorParam(nameProperty, "segment")?.node ?? nameProperty,
            });
          }
        }
      },
    };
  },
});

function isValidPathSegment(path: string, separator: string): boolean {
  if (path.startsWith(separator)) path = path.replace(separator, "");
  return isValidKey(path);
}
