import {
  createRule,
  getPagingOperation,
  isArrayModelType,
  paramMessage,
  type Model,
} from "@typespec/compiler";
import { getHttpOperation, type HttpOperationResponse } from "@typespec/http";
import { getExtensions } from "@typespec/openapi";

export const listInOperationNameRule = createRule({
  name: "list-in-operation-name",
  description:
    "Operations that return pageable or array-valued responses should use 'list' as the operation name prefix.",
  severity: "warning",
  messages: {
    default: paramMessage`Operation '${"operationName"}' returns a list/pageable response and should use method name starting with 'list'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const name = operation.name.toLowerCase();
        if (name.startsWith("list")) {
          return;
        }

        if (!isListOperation(context.program, operation)) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
          format: { operationName: operation.name },
        });
      },
    };
  },
});

function isListOperation(program: any, operation: any): boolean {
  // Check for TypeSpec paging metadata
  const [pagingOperation] = getPagingOperation(program, operation);
  if (pagingOperation !== undefined) {
    return true;
  }

  // Check for x-ms-pageable extension
  if (getExtensions(program, operation).has("x-ms-pageable")) {
    return true;
  }

  // Check if any success response has a collection-shaped body
  // (a model with a "value" array property and at most one other property)
  const [httpOperation] = getHttpOperation(program, operation);
  return httpOperation.responses.some((response) =>
    isCollectionResponse(program, response),
  );
}

function isCollectionResponse(
  program: any,
  response: HttpOperationResponse,
): boolean {
  const statusCode = response.statusCodes;
  if (typeof statusCode === "number" && statusCode >= 300) {
    return false;
  }

  for (const content of response.responses) {
    const body = content.body;
    if (body === undefined || body.type.kind !== "Model") {
      continue;
    }

    const model = body.type as Model;
    const valueProp = model.properties.get("value");
    if (valueProp === undefined) {
      continue;
    }

    if (
      valueProp.type.kind === "Model" &&
      isArrayModelType(program, valueProp.type)
    ) {
      const propCount = model.properties.size;
      if (propCount <= 2) {
        return true;
      }
    }
  }

  return false;
}
