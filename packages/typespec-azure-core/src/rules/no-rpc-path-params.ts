import { Operation, createRule } from "@typespec/compiler";
import { isPathParam } from "@typespec/http";
import { isExcludedCoreType } from "./utils.js";

export const noRpcPathParamsRule = createRule({
  name: "no-rpc-path-params",
  description: "Operations defined using RpcOperation should not have path parameters.",
  severity: "warning",
  messages: {
    default:
      "Operations defined using RpcOperation should not have path parameters. Consider using ResourceAction or ResourceCollectionAction instead.",
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        // First, let's make sure we're not already dealing with a core type or
        // a templated operation signature (whether it's an instance or not)
        if (
          isExcludedCoreType(context.program, operation) ||
          operation.node?.templateParameters.length !== 0
        ) {
          return;
        }

        // Walk up the sourceOperation chain to see if we find an RpcOperation
        // from Azure.Core
        const originalOperation = operation;
        while (operation.sourceOperation) {
          operation = operation.sourceOperation;
          if (
            operation.name.endsWith("RpcOperation") &&
            operation.namespace?.name === "Core" &&
            operation.namespace?.namespace?.name === "Azure"
          ) {
            // Check the original operation to see if it contains path
            // parameters.  We only need to check the operation parameters
            // because the route path is validated against the op parameters
            // separately.
            for (const [_, param] of originalOperation.parameters.properties) {
              if (isPathParam(context.program, param)) {
                context.reportDiagnostic({
                  target: originalOperation,
                });

                return;
              }
            }
          }
        }
      },
    };
  },
});
