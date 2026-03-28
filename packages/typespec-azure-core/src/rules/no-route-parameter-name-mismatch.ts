import { createRule, ignoreDiagnostics, Operation, paramMessage } from "@typespec/compiler";
import { getHttpOperation, HttpOperationPathParameter } from "@typespec/http";
import { isExcludedCoreType, isTemplatedInterfaceOperation } from "./utils.js";

interface OperationPathInfo {
  path: string;
  operation: Operation;
  paramNames: string[];
}

export const noRouteParameterNameMismatchRule = createRule({
  name: "no-route-parameter-name-mismatch",
  description: "Ensure that operations with the same path use consistent path parameter names.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-route-parameter-name-mismatch",
  messages: {
    default: paramMessage`Path "${"path"}" has inconsistent parameter name "${"paramName"}" which should be "${"expectedParamName"}" to match existing operation with path "${"existingPath"}"`,
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

        // Skip operations with any allowReserved path parameter per issue guidance
        if (pathParams.some((p) => p.allowReserved)) return;

        const path = httpOp.path;

        // Normalize path by replacing {paramName} with {}
        const normalizedPath = path.replace(/\{[^}]+\}/g, "{}");

        // Extract parameter names in order from the path
        const paramNames = [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);

        const existing = pathMap.get(normalizedPath);
        if (existing) {
          // Compare parameter names at each position
          for (let i = 0; i < paramNames.length && i < existing.paramNames.length; i++) {
            if (paramNames[i] !== existing.paramNames[i]) {
              context.reportDiagnostic({
                format: {
                  path,
                  paramName: paramNames[i],
                  expectedParamName: existing.paramNames[i],
                  existingPath: existing.path,
                },
                target: operation,
              });
            }
          }
        } else {
          pathMap.set(normalizedPath, { path, operation, paramNames });
        }
      },
    };
  },
});
