import { Enum, createRule } from "@typespec/compiler";
import { isFixed } from "../decorators.js";

export const extensibleEnumRule = createRule({
  name: "use-extensible-enum",
  description: "Enums should be extensible.",
  severity: "warning",
  messages: {
    default: "Enums should be defined without the `@fixed` decorator.",
  },
  create(context) {
    return {
      enum: (enumType: Enum) => {
        if (isFixed(context.program, enumType)) {
          context.reportDiagnostic({
            target: enumType,
          });
        }
      },
    };
  },
});
