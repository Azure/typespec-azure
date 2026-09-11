import {
  createTCGCContext,
  getClientLocation,
  getClientNameOverride,
  type TCGCContext,
} from "@azure-tools/typespec-client-generator-core";
import {
  isGlobalNamespace,
  isService,
  type Interface,
  type Namespace,
  type Operation,
  type Program,
} from "@typespec/compiler";
import { capitalize } from "@typespec/compiler/casing";
import { getOperationId } from "@typespec/openapi";

export function createAutorestOperationIdResolver(program: Program) {
  const tcgcContext = createTCGCContext(program, "@azure-tools/typespec-autorest", {
    mutateNamespace: false,
  });

  return (operation: Operation) => resolveAutorestOperationId(program, operation, tcgcContext);
}

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
