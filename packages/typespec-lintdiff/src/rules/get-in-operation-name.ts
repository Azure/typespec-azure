import {
  createTCGCContext,
  getClientLocation,
  getClientNameOverride,
  type TCGCContext,
} from "@azure-tools/typespec-client-generator-core";
import {
  createRule,
  isGlobalNamespace,
  isService,
  isTemplateDeclarationOrInstance,
  paramMessage,
  type Interface,
  type Namespace,
  type Operation,
  type Program,
} from "@typespec/compiler";
import { capitalize } from "@typespec/compiler/casing";
import { getHttpOperation } from "@typespec/http";
import { getOperationId } from "@typespec/openapi";

const validGetOperationId = /^(?:\w+_(?:Get|List)|Get|List)/;

export const getInOperationNameRule = createRule({
  name: "get-in-operation-name",
  description: "GET operationIds should use 'Get' or 'List' as the verb prefix.",
  severity: "warning",
  messages: {
    default: paramMessage`'GET' operation '${"operationId"}' should use method name 'Get' or method name starting with 'List'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(context.program, "@azure-tools/typespec-autorest", {
      mutateNamespace: false,
    });

    return {
      operation: (operation) => {
        if (isTemplateDeclarationOrInstance(operation)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "get") {
          return;
        }

        const operationId = resolveAutorestOperationId(context.program, operation, tcgcContext);
        if (operationId.length === 0 || validGetOperationId.test(operationId)) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
          format: { operationId },
        });
      },
    };
  },
});

function resolveAutorestOperationId(
  program: Program,
  operation: Operation,
  tcgcContext: TCGCContext,
): string {
  const explicitOperationId = getOperationId(program, operation);
  if (explicitOperationId) {
    return explicitOperationId;
  }

  const operationName = getClientName(tcgcContext, operation);
  const clientLocation = getClientLocation(tcgcContext, operation);

  if (clientLocation) {
    if (typeof clientLocation === "string") {
      return standardizeOperationId(`${clientLocation}_${operationName}`);
    }
    if (clientLocation.kind === "Interface") {
      return standardizeOperationId(
        `${getClientName(tcgcContext, clientLocation)}_${operationName}`,
      );
    }
    if (isGlobalNamespace(program, clientLocation) || isService(program, clientLocation)) {
      return standardizeOperationId(operationName);
    }
    return standardizeOperationId(`${getClientName(tcgcContext, clientLocation)}_${operationName}`);
  }

  let operationId: string;
  if (operation.interface) {
    operationId = `${getClientName(tcgcContext, operation.interface)}_${operationName}`;
  } else if (
    operation.namespace === undefined ||
    isGlobalNamespace(program, operation.namespace) ||
    isService(program, operation.namespace)
  ) {
    operationId = operationName;
  } else {
    operationId = `${getClientName(tcgcContext, operation.namespace)}_${operationName}`;
  }

  return standardizeOperationId(operationId);
}

function standardizeOperationId(operationId: string): string {
  return operationId
    .split("_")
    .map((part) => capitalize(part))
    .join("_");
}

function getClientName(tcgcContext: TCGCContext, type: Operation | Interface | Namespace): string {
  return getClientNameOverride(tcgcContext, type) ?? type.name;
}
