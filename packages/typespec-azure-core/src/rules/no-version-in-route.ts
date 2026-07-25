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
 * Matches a path segment that looks like an API version, e.g. `v1`, `V2`, `v1.0`, `v2.1.3`.
 */
const versionSegmentPattern = /^v\d+(\.\d+)*$/i;

/**
 * Find the version segment in a resolved operation path, if any.
 *
 * `{name}` placeholders are skipped: they are runtime values, not literal version segments,
 * even when the parameter happens to be named `v1`.
 */
function findVersionSegment(path: string): string | undefined {
  return path.split("/").find((segment) => {
    if (segment.startsWith("{")) return false;
    return versionSegmentPattern.test(segment);
  });
}

export const noVersionInRouteRule = createRule({
  name: "no-version-in-route",
  description: "Do not include an API version segment in operation routes.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-version-in-route",
  docs: fileRef.fromPackageRoot("src/rules/no-version-in-route.md"),
  messages: {
    default: paramMessage`Operation path "${"path"}" contains the API version segment "${"segment"}". Express versioning with the "api-version" query parameter instead.`,
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (isExcludedCoreType(context.program, operation)) return;
        if (isTemplatedInterfaceOperation(operation)) return;

        const path = ignoreDiagnostics(getHttpOperation(context.program, operation)).path;
        const segment = findVersionSegment(path);
        if (segment === undefined) return;

        // An operation declared with `is` inherits its route from the operation it aliases.
        // Report the source declaration instead, so re-exporting an interface (a common
        // `client.tsp` pattern) does not report the same route once per alias. If the source is
        // excluded from linting it will never be reported itself, so keep reporting the alias.
        const source = operation.sourceOperation;
        if (source !== undefined && !isExcludedCoreType(context.program, source)) {
          const sourcePath = ignoreDiagnostics(getHttpOperation(context.program, source)).path;
          if (findVersionSegment(sourcePath) === segment) return;
        }

        context.reportDiagnostic({
          format: { path, segment },
          target: operation,
        });
      },
    };
  },
});
