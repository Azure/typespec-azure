import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { getOperationsWithIncorrectVerbPrefix } from "./verb-prefix.js";

export const useDeleteForDeleteRule = createRule({
  name: "use-delete-for-delete",
  description: "DELETE SDK method names should use 'delete' as the verb prefix.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/use-delete-for-delete",
  docs: fileRef.fromPackageRoot("src/rules/use-delete-for-delete.md"),
  messages: {
    default: paramMessage`DELETE SDK method name '${"operationName"}' should start with 'delete'.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false },
    );

    return {
      root: () => {
        for (const { operation, operationName } of getOperationsWithIncorrectVerbPrefix(
          tcgcContext,
          "delete",
          "delete",
        )) {
          context.reportDiagnostic({
            target: operation,
            format: { operationName },
          });
        }
      },
    };
  },
});
