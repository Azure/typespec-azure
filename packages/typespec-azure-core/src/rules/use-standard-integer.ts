import { Model, createRule } from "@typespec/compiler";

export const useStandardInteger = createRule({
  name: "use-standard-integer",
  description: "Use only types that map to int32 or int64.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/use-standard-integer",
  messages: {
    default: "Recommended integer types are 'int32', 'int64' or 'safeint'.",
  },
  create(context) {
    return {
      model: (model: Model) => {
        const nonRecommendedInts = [
          "int64",
          "int8",
          "int16",
          "uint8",
          "uint16",
          "uint32",
          "uint64",
        ];
        for (const [name, prop] of model.properties) {
          if (prop.type.kind === "Scalar") {
            if (nonRecommendedInts.includes(prop.type.name)) {
              context.reportDiagnostic({
                target: prop.type,
              });
            }
          }
        }
      },
    };
  },
});
