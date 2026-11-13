import {
  createRule,
  fileRef,
  paramMessage,
  type Model,
  type ModelProperty,
} from "@typespec/compiler";
import { getResourceOperation } from "@typespec/rest";
import { clientLroResultKey, negationScopesKey } from "../internal-utils.js";
import { getLroEnvelopeProperty, getRawLroMetadata } from "../lro-metadata.js";

export const useValidClientLroResultRule = createRule({
  name: "use-valid-client-lro-result",
  description: "LRO client results should follow the operation's protocol result contract.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/use-valid-client-lro-result",
  docs: fileRef.fromPackageRoot("src/rules/use-valid-client-lro-result.md"),
  messages: {
    model: paramMessage`Resource lifecycle LRO '${"operation"}' should return its resource or completion response instead of the status-monitor response '${"model"}'.`,
    property: paramMessage`Resource lifecycle LRO '${"operation"}' should return its resource or completion response instead of the status-monitor property '${"property"}'.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const scopedSelections = context.program.stateMap(clientLroResultKey).get(operation);
        if (!scopedSelections) return;

        // Linter evaluation is emitter-independent; inspect all stored scopes and report once.
        const selections = Reflect.ownKeys(scopedSelections)
          .filter((scope) => scope !== negationScopesKey)
          .map((scope) => scopedSelections[scope])
          .filter(
            (selection): selection is Model | ModelProperty =>
              selection?.kind === "Model" || selection?.kind === "ModelProperty",
          );
        if (selections.length === 0) return;

        if (!getResourceOperation(context.program, operation)) return;
        const metadata = getRawLroMetadata(context.program, operation);
        if (!metadata) return;

        for (const selection of selections) {
          if (selection.kind === "Model") {
            if (
              selection === metadata.envelopeResult &&
              (metadata.finalResult !== selection || metadata.finalResultPath !== undefined)
            ) {
              context.reportDiagnostic({
                messageId: "model",
                target: operation.node ?? operation,
                format: {
                  operation: operation.name,
                  model: selection.name,
                },
              });
              return;
            }
          } else {
            const envelopeProperty = getLroEnvelopeProperty(metadata.envelopeResult, selection);
            if (
              envelopeProperty &&
              (metadata.finalEnvelopeResult !== metadata.envelopeResult ||
                metadata.finalResultPath !== envelopeProperty.name)
            ) {
              context.reportDiagnostic({
                messageId: "property",
                target: operation.node ?? operation,
                format: {
                  operation: operation.name,
                  property: envelopeProperty.name,
                },
              });
              return;
            }
          }
        }
      },
    };
  },
});
