import {
  createRule,
  getPagingOperation,
  ignoreDiagnostics,
  isArrayModelType,
  isList,
  isTemplateDeclarationOrInstance,
  paramMessage,
  type Model,
  type Operation,
  type Program,
} from "@typespec/compiler";
import { getHttpOperation, type HttpOperation, type HttpOperationResponse } from "@typespec/http";
import { getExtensions } from "@typespec/openapi";
import { createAutorestOperationIdResolver } from "./utils/resolve-autorest-operation-id.js";

const validListOperationId = /^(?:(?:\w+_List\w*)|List)$/;

export const listInOperationNameRule = createRule({
  name: "list-in-operation-name",
  description:
    "Operations that return pageable or array-valued responses should use 'list' as the operation name prefix.",
  severity: "warning",
  messages: {
    default: paramMessage`Operation '${"operationName"}' returns a list/pageable response and should use method name starting with 'list'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
  },
  create(context) {
    const resolveOperationId = createAutorestOperationIdResolver(context.program);

    return {
      operation: (operation) => {
        if (operation.interface === undefined && isTemplateDeclarationOrInstance(operation)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "get" && httpOperation.verb !== "post") {
          return;
        }

        const operationId = resolveOperationId(operation);
        if (validListOperationId.test(operationId)) {
          return;
        }

        if (!emitsListResponse(context.program, operation, httpOperation)) {
          return;
        }

        context.reportDiagnostic({
          target: getDiagnosticTarget(operation),
          format: { operationName: operationId },
        });
      },
    };
  },
});

function emitsListResponse(
  program: Program,
  operation: Operation,
  httpOperation: HttpOperation,
): boolean {
  if (getExtensions(program, operation).has("x-ms-pageable")) {
    return true;
  }

  const pagingOperation = ignoreDiagnostics(getPagingOperation(program, operation));
  if (isListOperation(program, operation) && pagingOperation?.output.nextLink !== undefined) {
    return true;
  }

  return httpOperation.responses.some((response) => isCollectionResponse(program, response));
}

function isCollectionResponse(program: Program, response: HttpOperationResponse): boolean {
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

    if (valueProp.type.kind === "Model" && isArrayModelType(program, valueProp.type)) {
      const propCount = model.properties.size;
      if (propCount <= 2) {
        return true;
      }
    }
  }

  return false;
}

function isListOperation(program: Program, operation: Operation): boolean {
  for (let current: Operation | undefined = operation; current; current = current.sourceOperation) {
    if (isList(program, current)) {
      return true;
    }
  }
  return false;
}

function getDiagnosticTarget(
  operation: Operation,
): Operation | NonNullable<Operation["interface"]> {
  const operationInterface = operation.interface;
  if (
    operationInterface?.node !== undefined &&
    operation.node?.parent !== operationInterface.node
  ) {
    return operationInterface;
  }
  return operation;
}
