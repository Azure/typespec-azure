import {
  createRule,
  fileRef,
  ignoreDiagnostics,
  ModelProperty,
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

/**
 * Resolve the property back to the declaration it was ultimately copied from.
 *
 * Spreading a shared parameter model into an operation (or aliasing an operation with `is`)
 * clones the property, so a single offending declaration would otherwise be reported once for
 * every operation that consumes it. The declaration is also where the fix, or a suppression,
 * has to go.
 */
function getPropertyDeclaration(property: ModelProperty): ModelProperty {
  let current = property;
  while (current.sourceProperty !== undefined) {
    current = current.sourceProperty;
  }
  return current;
}

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
    // A declaration can be reached through many operations; only report it once.
    const reported = new Set<ModelProperty>();

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

          const declaration = getPropertyDeclaration(property.property);
          if (reported.has(declaration)) continue;
          reported.add(declaration);

          context.reportDiagnostic({
            format: { name, suggestion },
            target: declaration,
          });
        }
      },
    };
  },
});
