import {
  type Model,
  type ModelProperty,
  type Operation,
  type Scalar,
  createRule,
  fileRef,
  isArrayModelType,
  paramMessage,
} from "@typespec/compiler";

const disallowList = new Set(["integer", "numeric", "float", "decimal"]);
const alternatives = new Map([
  ["integer", "int32"],
  ["numeric", "int32"],
  ["float", "float32"],
  ["decimal", "float32"],
]);

export const noGenericNumericRule = createRule({
  name: "no-generic-numeric",
  docs: fileRef.fromPackageRoot("src/rules/no-generic-numeric.md"),
  description: "Don't use generic types. Use more specific types instead.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-generic-numeric",
  messages: {
    default: paramMessage`Don't use generic type '${"name"}'. Use a more specific type that specifies the bit size, such as '${"alternative"}' instead.`,
    extend: paramMessage`Don't extend generic type '${"name"}'. Use a more specific type that specifies the bit size, such as '${"alternative"}' instead.`,
  },
  create(context) {
    function checkProperty(prop: ModelProperty) {
      let type = prop.type;
      const visited = new Set<Model>();
      while (type.kind === "Model" && isArrayModelType(type) && !visited.has(type)) {
        visited.add(type);
        type = type.indexer.value;
      }
      if (type.kind === "Scalar" && disallowList.has(type.name)) {
        context.reportDiagnostic({
          target: prop,
          format: {
            name: type.name,
            alternative: alternatives.get(type.name)!,
          },
        });
      }
    }

    return {
      model: (model: Model) => {
        for (const prop of model.properties.values()) {
          checkProperty(prop);
        }
      },
      operation: (operation: Operation) => {
        for (const prop of operation.parameters.properties.values()) {
          // Spread parameters are checked on their source declarations.
          if (!prop.sourceProperty) {
            checkProperty(prop);
          }
        }
      },
      scalar: (scalar: Scalar) => {
        // if the scalar is the base scalar, then we don't need to check it as it will surface
        // in usage (for example: as a model property)
        if (disallowList.has(scalar.name)) {
          return;
        }
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
