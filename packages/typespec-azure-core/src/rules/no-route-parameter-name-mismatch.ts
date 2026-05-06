import {
  createRule,
  getNamespaceFullName,
  ignoreDiagnostics,
  Operation,
  paramMessage,
} from "@typespec/compiler";
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

function getFullyQualifiedOperationName(operation: Operation): string {
  const parts: string[] = [];
  if (operation.namespace) {
    parts.push(getNamespaceFullName(operation.namespace));
  }
  if (operation.interface) {
    parts.push(operation.interface.name);
  }
  parts.push(operation.name);
  return parts.join(".");
}

export const noRouteParameterNameMismatchRule = createRule({
  name: "no-route-parameter-name-mismatch",
  description: "Ensure that operations with the same path use consistent path parameter names.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-route-parameter-name-mismatch",
  messages: {
    default: paramMessage`Operation "${"operationName"}" path "${"path"}" has inconsistent parameter name "${"paramName"}" which should be "${"expected"}" to match operation "${"existingOperationName"}" with path "${"existingPath"}"`,
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

        // Skip paths that have no static segments (only parameters and separators),
        // since these are too generic to meaningfully compare parameter names.
        // Also skip paths where two path variables occur in a row with no static
        // segment between them, since it is difficult to reason about such paths.
        if (normalizedPath.replace(/[{}/]/g, "") === "" || normalizedPath.includes("{}/{}")) {
          return;
        }

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
            // Stop comparison when only one parameter uses allowReserved, since
            // parameters with differing allowReserved settings should not be matched
            // and the rest of the parameters are irrelevant
            if (params[i].allowReserved !== existing.params[i].allowReserved) {
              break;
            }
            if (params[i].name !== existing.params[i].name) {
              context.reportDiagnostic({
                format: {
                  operationName: getFullyQualifiedOperationName(operation),
                  path,
                  paramName: params[i].name,
                  expected: existing.params[i].name,
                  existingOperationName: getFullyQualifiedOperationName(existing.operation),
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
