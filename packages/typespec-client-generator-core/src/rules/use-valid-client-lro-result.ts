import {
  createRule,
  fileRef,
  getTypeName,
  paramMessage,
  type Model,
  type ModelProperty,
} from "@typespec/compiler";
import { getResourceOperation } from "@typespec/rest";
import { clientLroResultKey } from "../internal-utils.js";
import { getRawLroMetadata, resolveClientLroResultSelection } from "../lro-metadata.js";

export const useValidClientLroResultRule = createRule({
  name: "use-valid-client-lro-result",
  description: "LRO client results should follow the operation's protocol result contract.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/use-valid-client-lro-result",
  docs: fileRef.fromPackageRoot("src/rules/use-valid-client-lro-result.md"),
  messages: {
    default: paramMessage`@clientLroResult on resource LRO '${"operation"}' selects '${"actual"}' instead of '${"expected"}'.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const scopedSelections = context.program.stateMap(clientLroResultKey).get(operation);
        if (!scopedSelections) return;

        // Linter evaluation is emitter-independent; inspect all stored scopes and report once.
        const selections = Reflect.ownKeys(scopedSelections)
          .map((scope) => scopedSelections[scope])
          .filter(
            (selection): selection is Model | ModelProperty =>
              selection?.kind === "Model" || selection?.kind === "ModelProperty",
          );
        if (selections.length === 0) return;

        const resourceOperation = getResourceOperation(context.program, operation);
        if (!resourceOperation) return;
        const metadata = getRawLroMetadata(context.program, operation);
        if (!metadata) return;
        const expectedResult =
          resourceOperation.operation === "delete" ? "void" : resourceOperation.resourceType;

        for (const selection of selections) {
          // Invalid envelope or property selections are reported by invalid-client-lro-result.
          const [clientResult] = resolveClientLroResultSelection(metadata, selection);
          if (!clientResult || clientResult.finalResult === expectedResult) {
            continue;
          }

          context.reportDiagnostic({
            target: operation.node ?? operation,
            format: {
              operation: operation.name,
              actual: getTypeName(clientResult.finalResult),
              expected: expectedResult === "void" ? expectedResult : getTypeName(expectedResult),
            },
          });
          return;
        }
      },
    };
  },
});
