import {
  createRule,
  fileRef,
  ignoreDiagnostics,
  Operation,
  paramMessage,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { isExcludedCoreType, isTemplatedInterfaceOperation } from "./utils.js";

/**
 * The standard collection query options defined by the Azure REST API Guidelines.
 * The OData spelling of these prefixes each name with a `$`, which Azure services must not do.
 */
const standardQueryOptions = [
  "filter",
  "orderby",
  "skip",
  "top",
  "maxpagesize",
  "select",
  "expand",
];

export const noDollarPrefixedQueryParamsRule = createRule({
  name: "no-dollar-prefixed-query-params",
  description: "Do not prefix standard collection query parameter names with a dollar sign.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-dollar-prefixed-query-params",
  docs: fileRef.fromPackageRoot("src/rules/no-dollar-prefixed-query-params.md"),
  messages: {
    default: paramMessage`Query parameter "${"name"}" must not be prefixed with "$". Use "${"suggestion"}" instead.`,
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (isExcludedCoreType(context.program, operation)) return;
        if (isTemplatedInterfaceOperation(operation)) return;

        const httpOperation = ignoreDiagnostics(getHttpOperation(context.program, operation));
        for (const property of httpOperation.parameters.properties) {
          if (property.kind !== "query") continue;

          const name = property.options.name;
          if (!name.startsWith("$")) continue;

          const suggestion = standardQueryOptions.find(
            (option) => option === name.slice(1).toLowerCase(),
          );
          if (suggestion === undefined) continue;

          context.reportDiagnostic({
            format: { name, suggestion },
            target: property.property,
          });
        }
      },
    };
  },
});
