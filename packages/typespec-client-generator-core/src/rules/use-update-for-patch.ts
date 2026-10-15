import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { getOperationsWithIncorrectVerbPrefix } from "./verb-prefix.js";

export const useUpdateForPatchRule = createRule({
  name: "use-update-for-patch",
  description: "ARM PATCH SDK method names should use 'update' as the verb prefix.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/use-update-for-patch",
  docs: fileRef.fromPackageRoot("src/rules/use-update-for-patch.md"),
  messages: {
    default: paramMessage`PATCH SDK method name '${"operationName"}' should start with 'update'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
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
          "patch",
          "update",
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
