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

        const httpOperation = ignoreDiagnostics(getHttpOperation(context.program, operation));
        const path = httpOperation.path;

        for (const segment of path.split("/")) {
          // Skip path parameters. A `{name}` placeholder is a runtime value, not a literal
          // version segment, even when the parameter happens to be named `v1`.
          if (segment.startsWith("{")) continue;
          if (versionSegmentPattern.test(segment)) {
            context.reportDiagnostic({
              format: { path, segment },
              target: operation,
            });
            return;
          }
        }
      },
    };
  },
});
