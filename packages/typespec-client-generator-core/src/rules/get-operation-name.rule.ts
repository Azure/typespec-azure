import {
  type Interface,
  type Namespace,
  type Operation,
  type Program,
  createRule,
  fileRef,
  isGlobalNamespace,
  isService,
  isTemplateDeclarationOrInstance,
  paramMessage,
} from "@typespec/compiler";
import { capitalize } from "@typespec/compiler/casing";
import { getHttpOperation } from "@typespec/http";
import { getOperationId } from "@typespec/openapi";
import { createTCGCContext } from "../context.js";
import { getClientLocation, getClientNameOverride } from "../decorators.js";
import type { TCGCContext } from "../interfaces.js";

const validGetOperationId = /^(?:\w+_(?:Get|List)|Get|List)/;

export const getOperationNameRule = createRule({
  name: "get-operation-name",
  docs: fileRef.fromPackageRoot("src/rules/get-operation-name.md"),
  description: "GET operation IDs should use 'Get' or 'List' as the verb prefix.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/get-operation-name",
  messages: {
    default: paramMessage`GET operation ID '${"operationId"}' should use 'Get' or 'List' as the verb prefix. Changing an operation ID after an SDK has shipped may be a breaking change.`,
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

  if (operation.interface) {
    return standardizeOperationId(
      `${getClientName(tcgcContext, operation.interface)}_${operationName}`,
    );
  }
  if (
    operation.namespace === undefined ||
    isGlobalNamespace(program, operation.namespace) ||
    isService(program, operation.namespace)
  ) {
    return standardizeOperationId(operationName);
  }
  return standardizeOperationId(
    `${getClientName(tcgcContext, operation.namespace)}_${operationName}`,
  );
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
