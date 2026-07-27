import { createRule, isErrorModel, type Model, type Type } from "@typespec/compiler";
import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { getHttpOperation, type HttpOperationResponse, type HttpStatusCodeRange } from "@typespec/http";
import { getExtensions } from "@typespec/openapi";
import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";

export const lroErrorContentRule = createRule({
  name: "lro-error-content",
  description:
    "LRO operations must use the standard ARM ErrorResponse type for error responses, not custom error models.",
  severity: "warning",
  messages: {
    default:
      "Error response content of long running operations must follow the standard error schema provided in the Azure common types. Use `Azure.ResourceManager.CommonTypes.ErrorResponse` instead of a custom error model.",
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (resolveProviderNamespace(context.program, namespace) === undefined) {
          return;
        }

        // Check if this is an LRO operation
        const lroMetadata = getLroMetadata(context.program, operation);
        const extensions = getExtensions(context.program, operation);
        const isLro =
          lroMetadata !== undefined ||
          extensions.get("x-ms-long-running-operation") === true;

        if (!isLro) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);

        for (const response of httpOperation.responses) {
          if (!isErrorResponse(response.statusCodes)) {
            continue;
          }

          // Check if the response body model traces to the standard ErrorResponse
          for (const innerResponse of response.responses) {
            if (innerResponse.body === undefined) {
              continue;
            }

            const bodyType = innerResponse.body.type;
            if (bodyType.kind !== "Model") {
              continue;
            }

            if (!isStandardErrorResponse(bodyType)) {
              context.reportDiagnostic({
                target: operation,
              });
              return; // Report once per operation
            }
          }
        }
      },
    };
  },
});

function isErrorResponse(statusCode: number | "*" | HttpStatusCodeRange): boolean {
  if (statusCode === "*") {
    return true; // default response is the error response
  }
  if (typeof statusCode === "number") {
    return statusCode >= 400;
  }
  return statusCode.start >= 400;
}

/**
 * Check if a model is or extends the standard ARM ErrorResponse.
 * Walks the base model chain looking for a model named "ErrorResponse"
 * in a namespace starting with "Azure.ResourceManager".
 */
function isStandardErrorResponse(model: Model): boolean {
  let current: Model | undefined = model;
  while (current !== undefined) {
    if (isArmErrorResponseModel(current)) {
      return true;
    }
    // Also check if the model IS an error model via @error decorator
    // and has the right shape from ARM common types
    current = current.baseModel;
  }

  // Check sourceModel chain (for `is` keyword usage)
  current = model;
  while (current !== undefined) {
    if (isArmErrorResponseModel(current)) {
      return true;
    }
    current = current.sourceModel;
  }

  return false;
}

function isArmErrorResponseModel(model: Model): boolean {
  const ns = getFullNamespaceName(model);
  return (
    model.name === "ErrorResponse" &&
    ns !== undefined &&
    (ns.startsWith("Azure.ResourceManager") || ns.startsWith("Azure.Core"))
  );
}

function getFullNamespaceName(model: Model): string | undefined {
  const ns = model.namespace;
  if (ns === undefined) {
    return undefined;
  }
  const parts: string[] = [];
  let current = ns;
  while (current !== undefined && current.name !== "") {
    parts.unshift(current.name);
    current = current.namespace!;
  }
  return parts.join(".");
}
