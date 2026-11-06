import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { getClientNameOverride } from "../decorators.js";
import { AllScopes } from "../internal-utils.js";
import { getLibraryName } from "../public-utils.js";

export const noRepeatedClientNameRule = createRule({
  name: "no-repeated-client-name",
  description: "SDK method names should not repeat their owning subclient name.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/no-repeated-client-name",
  docs: fileRef.fromPackageRoot("src/rules/no-repeated-client-name.md"),
  messages: {
    default: paramMessage`SDK method '${"methodName"}' repeats its owning subclient name '${"clientName"}'. Remove the client name from the method name.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false },
    );
    return {
      operation(operation) {
        const client = tcgcContext.getClientForOperation(operation);
        if (!client?.parent) return;
        const clientName =
          client.type && getClientNameOverride(tcgcContext, client.type, AllScopes)
            ? getLibraryName(tcgcContext, client.type, AllScopes)
            : client.name;
        const noun = clientName.endsWith("s") ? clientName.slice(0, -1) : clientName;
        if (noun.length === 0) return;
        const methodName = getLibraryName(tcgcContext, operation, AllScopes);
        if (methodName.includes(noun)) {
          context.reportDiagnostic({
            target: operation,
            format: { methodName, clientName },
          });
        }
      },
    };
  },
});
