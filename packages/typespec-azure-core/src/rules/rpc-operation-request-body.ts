import { Operation, createRule, paramMessage } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { isAzureSubNamespace, isExcludedCoreType } from "./utils.js";

export const rpcOperationRequestBodyRule = createRule({
  name: "rpc-operation-request-body",
  description: "Warning for RPC body problems.",
  severity: "warning",
  messages: {
    default: `There is an issue with the RPCOperation request body.`,
    noBodyAllowed: paramMessage`RPCOperation with '@${"verb"}' cannot have a body.`,
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (isExcludedCoreType(context.program, operation)) return;
        if (operation.node.templateParameters.length !== 0) return;
        if (!isAzureSubNamespace(context.program, operation.namespace)) return;

        const originalOperation = operation;
        while (operation.sourceOperation) {
          operation = operation.sourceOperation;
          if (
            operation.name === "RpcOperation" &&
            operation.namespace?.name === "Core" &&
            operation.namespace?.namespace?.name === "Azure"
          ) {
            const httpOperation = getHttpOperation(context.program, originalOperation)[0];
            const verb = httpOperation.verb.toLowerCase();
            if (verb === "get" || verb === "delete") {
              context.reportDiagnostic({
                target: originalOperation,
                messageId: "noBodyAllowed",
                format: { verb: verb },
              });
            }
          }
        }
      },
    };
  },
});
