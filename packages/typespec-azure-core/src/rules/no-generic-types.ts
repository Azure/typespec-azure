import { Model, createRule, paramMessage } from "@typespec/compiler";

const disallowList = new Set(["integer", "numeric", "float", "decimal"]);
const alternatives = new Map([
  ["integer", "int32"],
  ["numeric", "int32"],
  ["float", "float32"],
  ["decimal", "float32"],
]);

export const noGenericTypesRule = createRule({
  name: "no-generic-types",
  description: "Don't use generic types. Use more specific types instead.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-generic-types",
  messages: {
    default: paramMessage`Don't use generic type '${"name"}'. Use a more specific type that specifies the bit size, such as '${"alternative"}' instead.`,
  },
  create(context) {
    return {
      model: (model: Model) => {
        for (const [_, prop] of model.properties) {
          if (prop.type.kind === "Scalar") {
            if (disallowList.has(prop.type.name)) {
              context.reportDiagnostic({
                target: prop.type,
                format: {
                  name: prop.type.name,
                  alternative: alternatives.get(prop.type.name)!,
                },
              });
            }
          }
        }
      },
    };
  },
});
