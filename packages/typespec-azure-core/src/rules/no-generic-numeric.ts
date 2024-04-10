import { Model, Scalar, createRule, paramMessage } from "@typespec/compiler";

const disallowList = new Set(["integer", "numeric", "float", "decimal"]);
const alternatives = new Map([
  ["integer", "int32"],
  ["numeric", "int32"],
  ["float", "float32"],
  ["decimal", "float32"],
]);

export const noGenericNumericRule = createRule({
  name: "no-generic-numeric",
  description: "Don't use generic types. Use more specific types instead.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-generic-numeric",
  messages: {
    default: paramMessage`Don't use generic type '${"name"}'. Use a more specific type that specifies the bit size, such as '${"alternative"}' instead.`,
    extend: paramMessage`Don't extend generic type '${"name"}'. Use a more specific type that specifies the bit size, such as '${"alternative"}' instead.`,
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
      scalar: (scalar: Scalar) => {
        let baseScalar: Scalar | undefined = undefined;
        while (scalar.baseScalar !== undefined) {
          baseScalar = scalar.baseScalar;
          break;
        }
        if (baseScalar === undefined) {
          return;
        }
        if (disallowList.has(baseScalar.name)) {
          context.reportDiagnostic({
            target: scalar,
            messageId: "extend",
            format: {
              name: baseScalar.name,
              alternative: alternatives.get(baseScalar.name)!,
            },
          });
        }
      },
    };
  },
});
