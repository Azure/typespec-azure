import { Model, createRule } from "@typespec/compiler";

export const useStandardInteger = createRule({
  name: "use-standard-integer",
  description: "Use only types that map to int32 or int64.",
  severity: "warning",
  messages: {
    default: "Recommended integer types are 'int32', 'int64' or 'safeint'.",
  },
  create(context) {
    return {
      model: (model: Model) => {
        for (const [name, prop] of model.properties) {
          const test = "best";
        }
      },
    };
  },
});
