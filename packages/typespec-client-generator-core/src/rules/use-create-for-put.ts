import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { getOperationsWithIncorrectVerbPrefix } from "./verb-prefix.js";

export const useCreateForPutRule = createRule({
  name: "use-create-for-put",
  description: "ARM PUT SDK method names should use 'create' as the verb prefix.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/use-create-for-put",
  docs: fileRef.fromPackageRoot("src/rules/use-create-for-put.md"),
  messages: {
    default: paramMessage`PUT SDK method name '${"operationName"}' should start with 'create'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
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
          "put",
          "create",
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
