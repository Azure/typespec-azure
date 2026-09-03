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
import { getOperationId } from "@typespec/openapi";

export const operationIdNounVerbRule = createRule({
  name: "operation-id-noun-verb",
  description:
    "OperationIds should follow the Noun_Verb convention without repeating the noun after the underscore.",
  severity: "warning",
  messages: {
    default: paramMessage`Per the Noun_Verb convention for Operation Ids, the noun '${"noun"}' should not appear after the underscore. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(context.program, "@azure-tools/typespec-autorest", {
      mutateNamespace: false,
    });
    let emittedOperations: Set<Operation> | undefined;

    function getEmittedOperations(): Set<Operation> {
      if (emittedOperations === undefined) {
        emittedOperations = new Set(
          tcgcContext.getClients().flatMap((client) => tcgcContext.getOperationsForClient(client)),
        );
      }
      return emittedOperations;
    }

    return {
      operation: (operation) => {
        if (isTemplateDeclarationOrInstance(operation) || !getEmittedOperations().has(operation)) {
          return;
        }

        const operationId = resolveAutorestOperationId(context.program, operation, tcgcContext);
        if (operationId.length === 0 || !operationId.includes("_")) {
          return;
        }

        const [nounPart, verbPart = ""] = operationId.split("_", 2);
        if (nounPart.length === 0 || verbPart.length === 0) {
          return;
        }

        const singularizedNoun =
          nounPart.endsWith("s") && nounPart.length > 1 ? nounPart.slice(0, -1) : undefined;

        if (
          verbPart.includes(nounPart) ||
          (singularizedNoun !== undefined && verbPart.includes(singularizedNoun))
        ) {
          context.reportDiagnostic({
            target: operation,
            format: {
              noun: nounPart,
            },
          });
        }
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
