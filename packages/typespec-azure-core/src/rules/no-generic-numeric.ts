import {
  type Model,
  type ModelProperty,
  type Scalar,
  createRule,
  fileRef,
  isArrayModelType,
  isRecordModelType,
  paramMessage,
} from "@typespec/compiler";
import { SyntaxKind } from "@typespec/compiler/ast";

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
    return {
      modelProperty: (prop: ModelProperty) => {
        const modelNode = prop.model?.node;
        // Copied operation parameters are checked at their source declarations.
        if (
          prop.sourceProperty &&
          modelNode?.parent?.kind === SyntaxKind.OperationSignatureDeclaration &&
          modelNode.parent.parameters === modelNode
        ) {
          return;
        }

        let type = prop.type;
        const visited = new Set<Model>();
        while (
          type.kind === "Model" &&
          (isArrayModelType(type) || isRecordModelType(type)) &&
          !visited.has(type)
        ) {
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
