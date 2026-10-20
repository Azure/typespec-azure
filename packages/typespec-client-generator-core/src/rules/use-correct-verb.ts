import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";
import { createTCGCContext } from "../context.js";
import { AllScopes } from "../internal-utils.js";
import { getLibraryName } from "../public-utils.js";

const verbPrefixes = { put: "create", patch: "update", delete: "delete" };

export const useCorrectVerbRule = createRule({
  name: "use-correct-verb",
  description:
    "PUT, PATCH, and DELETE SDK method names should start with 'create', 'update', and 'delete', respectively.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/use-correct-verb",
  docs: fileRef.fromPackageRoot("src/rules/use-correct-verb.md"),
  messages: {
    default: paramMessage`${"verb"} SDK method name '${"operationName"}' should start with '${"prefix"}'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false },
    );

    return {
      root: () => {
        const [services] = getAllHttpServices(context.program);
        for (const service of services) {
          for (const { operation, verb } of service.operations) {
            if (verb !== "put" && verb !== "patch" && verb !== "delete") continue;
            const prefix = verbPrefixes[verb];
            const operationName = getLibraryName(tcgcContext, operation, AllScopes);
            if (!operationName.toLowerCase().startsWith(prefix)) {
              context.reportDiagnostic({
                target: operation,
                format: { verb: verb.toUpperCase(), operationName, prefix },
              });
            }
          }
        }
      },
    };
  },
});
