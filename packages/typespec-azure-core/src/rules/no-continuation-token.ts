import { createRule, fileRef, getTypeName } from "@typespec/compiler";
import { isExcludedCoreType } from "./utils.js";

export const noContinuationTokenRule = createRule({
  name: "no-continuation-token",
  description: "Use next-link pagination instead of continuation tokens in Azure APIs.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-continuation-token",
  docs: fileRef.fromPackageRoot("src/rules/no-continuation-token.md"),
  messages: {
    default: "Use @nextLink pagination instead of @continuationToken in Azure APIs.",
  },
  create(context) {
    return {
      modelProperty(property) {
        if (isExcludedCoreType(context.program, property)) return;
        for (const decorator of property.decorators) {
          if (
            decorator.definition?.name === "@continuationToken" &&
            getTypeName(decorator.definition.namespace) === "TypeSpec"
          ) {
            context.reportDiagnostic({ target: decorator.node ?? property });
          }
        }
      },
    };
  },
});
