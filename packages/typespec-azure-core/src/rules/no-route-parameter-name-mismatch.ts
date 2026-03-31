import { createRule, ignoreDiagnostics, Operation, paramMessage } from "@typespec/compiler";
import { getHttpOperation, HttpOperationPathParameter } from "@typespec/http";
import { isExcludedCoreType, isTemplatedInterfaceOperation } from "./utils.js";

interface PathParamInfo {
  name: string;
  allowReserved: boolean;
}

interface OperationPathInfo {
  path: string;
  operation: Operation;
  params: PathParamInfo[];
}

export const noRouteParameterNameMismatchRule = createRule({
  name: "no-route-parameter-name-mismatch",
  description: "Ensure that operations with the same path use consistent path parameter names.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-route-parameter-name-mismatch",
  messages: {
    default: paramMessage`Path "${"path"}" has inconsistent parameter name "${"paramName"}" which should be "${"expected"}" to match existing operation with path "${"existingPath"}"`,
  },
  create(context) {
    // Map from normalized path (params replaced with {}) to first operation seen
    const pathMap = new Map<string, OperationPathInfo>();

    return {
      operation: (operation: Operation) => {
        if (isExcludedCoreType(context.program, operation)) return;
        if (isTemplatedInterfaceOperation(operation)) return;

        const httpOp = ignoreDiagnostics(getHttpOperation(context.program, operation));

        // Get path parameters
        const pathParams = httpOp.parameters.parameters.filter(
          (p): p is HttpOperationPathParameter => p.type === "path",
        );

        const path = httpOp.path;

        // Normalize path by replacing {paramName} with {}
        const normalizedPath = path.replace(/\{[^}]+\}/g, "{}");

        // Extract parameter names in order from the path
        // Note: httpOp.path is the legacy path which strips URI template operators,
        // but we defensively strip any leading +/. /; /# characters for robustness
        const paramNames = [...path.matchAll(/\{([^}]+)\}/g)].map((m) =>
          m[1].replace(/^[+.;#/]/, ""),
        );

        // Build params info with allowReserved status
        const params: PathParamInfo[] = paramNames.map((name) => {
          const httpParam = pathParams.find((p) => p.name === name);
          return { name, allowReserved: httpParam?.allowReserved ?? false };
        });

        const existing = pathMap.get(normalizedPath);
        if (existing) {
          // Compare parameter names at each position
          for (let i = 0; i < params.length && i < existing.params.length; i++) {
            // Skip comparison when either parameter uses allowReserved, since
            // allowReserved parameters (e.g. scope/resourceUri) represent different
            // scope types and legitimately use different names
            if (params[i].allowReserved || existing.params[i].allowReserved) {
              continue;
            }
            if (params[i].name !== existing.params[i].name) {
              context.reportDiagnostic({
                format: {
                  path,
                  paramName: params[i].name,
                  expected: existing.params[i].name,
                  existingPath: existing.path,
                },
                target: operation,
              });
            }
          }
        } else {
          pathMap.set(normalizedPath, { path, operation, params });
        }
      },
    };
  },
});
