import { getLroMetadata, FinalStateValue } from "@azure-tools/typespec-azure-core";
import { createRule, type Operation, type Program } from "@typespec/compiler";
import { getHttpOperation, type HttpOperationResponse } from "@typespec/http";
import { getExtensions } from "@typespec/openapi";

const allowedFinalStateVia = new Set<string>([
  FinalStateValue.location,
  FinalStateValue.azureAsyncOperation,
]);

export const longRunningOperationsOptionsValidatorRule = createRule({
  name: "long-running-operations-options-validator",
  description:
    "POST LRO operations with a return schema must specify a valid final-state-via polling strategy.",
  severity: "warning",
  messages: {
    default:
      "A LRO Post operation with return schema must have a valid final-state-via polling configuration (location or azure-async-operation).",
  },
  create(context) {
    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "post") {
          return;
        }

        if (!isLongRunning(context.program, operation)) {
          return;
        }

        if (!hasSuccessResponseWithBody(httpOperation.responses)) {
          return;
        }

        // Check TypeSpec-native LRO metadata first
        const lroMetadata = getLroMetadata(context.program, operation);
        if (lroMetadata !== undefined) {
          if (allowedFinalStateVia.has(lroMetadata.finalStateVia)) {
            return;
          }
        }

        // Check extension-based final-state-via
        const extensions = getExtensions(context.program, operation);
        const lroOptions = extensions.get("x-ms-long-running-operation-options") as
          | Record<string, string>
          | undefined;
        if (lroOptions !== undefined) {
          const finalStateVia = lroOptions["final-state-via"];
          if (finalStateVia === "location" || finalStateVia === "azure-async-operation") {
            return;
          }
        }

        context.reportDiagnostic({
          target: operation,
        });
      },
    };
  },
});

function isLongRunning(program: Program, operation: Operation): boolean {
  return (
    getLroMetadata(program, operation) !== undefined ||
    getExtensions(program, operation).get("x-ms-long-running-operation") === true
  );
}

function hasSuccessResponseWithBody(responses: HttpOperationResponse[]): boolean {
  return responses.some((response) => {
    const code = response.statusCodes;
    if (typeof code !== "number" || code >= 300) {
      return false;
    }
    return response.responses.some((r) => r.body !== undefined);
  });
}
