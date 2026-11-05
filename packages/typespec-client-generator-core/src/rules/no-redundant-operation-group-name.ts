import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { getClientNameOverride } from "../decorators.js";
import { AllScopes } from "../internal-utils.js";
import { getLibraryName } from "../public-utils.js";

export const noRedundantOperationGroupNameRule = createRule({
  name: "no-redundant-operation-group-name",
  description: "SDK method names should not repeat their operation group name.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/no-redundant-operation-group-name",
  docs: fileRef.fromPackageRoot("src/rules/no-redundant-operation-group-name.md"),
  messages: {
    default: paramMessage`SDK method '${"methodName"}' repeats its operation group name '${"groupName"}'. Remove the group name from the method name.`,
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
        const groupName =
          client.type && getClientNameOverride(tcgcContext, client.type, AllScopes)
            ? getLibraryName(tcgcContext, client.type, AllScopes)
            : client.name;
        const noun = groupName.endsWith("s") ? groupName.slice(0, -1) : groupName;
        if (noun.length === 0) return;
        const methodName = getLibraryName(tcgcContext, operation, AllScopes);
        if (methodName.includes(noun)) {
          context.reportDiagnostic({
            target: operation,
            format: { methodName, groupName },
          });
        }
      },
    };
  },
});
