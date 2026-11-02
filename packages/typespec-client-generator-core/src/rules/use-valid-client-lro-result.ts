import { createRule, fileRef, paramMessage, type ModelProperty } from "@typespec/compiler";
import { clientLroResultKey, negationScopesKey } from "../internal-utils.js";
import { getCachedLroProtocolMetadata, isLroProtocolResultProperty } from "../lro-metadata.js";

export const useValidClientLroResultRule = createRule({
  name: "use-valid-client-lro-result",
  description: "LRO client results should follow the operation's protocol result contract.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/use-valid-client-lro-result",
  docs: fileRef.fromPackageRoot("src/rules/use-valid-client-lro-result.md"),
  messages: {
    default: paramMessage`Resource lifecycle LRO '${"operation"}' should return a resource response instead of the status-monitor result property '${"property"}'.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const scopedSelections = context.program.stateMap(clientLroResultKey).get(operation);
        if (!scopedSelections) return;

        // Linter evaluation is emitter-independent; inspect all stored scopes and report once.
        const selectedProperties = Reflect.ownKeys(scopedSelections)
          .filter((scope) => scope !== negationScopesKey)
          .map((scope) => scopedSelections[scope])
          .filter((selection): selection is ModelProperty => selection?.kind === "ModelProperty");
        if (selectedProperties.length === 0) return;

        const protocol = getCachedLroProtocolMetadata(context.program, operation);
        if (!protocol?.initial.resourceOperation) return;

        const resultProperty = selectedProperties.find((selection) =>
          isLroProtocolResultProperty(protocol, selection),
        );
        if (!resultProperty) return;

        context.reportDiagnostic({
          target: operation.node ?? operation,
          format: {
            operation: operation.name,
            property: resultProperty.name,
          },
        });
      },
    };
  },
});
