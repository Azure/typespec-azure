import {
  createRule,
  fileRef,
  getNamespaceFullName,
  ignoreDiagnostics,
  isTemplateDeclarationOrInstance,
  paramMessage,
  type Operation,
  type Program,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { getActionDetails, isAutoRoute, type ActionDetails } from "@typespec/rest";
import {
  isExcludedCoreType,
  isTemplatedInterfaceOperation,
  isTemplatedOperationSignature,
} from "./utils.js";

function getOperationName(operation: Operation): string {
  const parts: string[] = [];
  if (operation.namespace) {
    parts.push(getNamespaceFullName(operation.namespace));
  }
  if (operation.interface) {
    parts.push(operation.interface.name);
  }
  parts.push(operation.name);
  return parts.join(".");
}

function getSourceAction(
  program: Program,
  operation: Operation,
): { operation: Operation; details: ActionDetails } | undefined {
  let sourceOperation = operation.sourceOperation;
  while (sourceOperation) {
    const details = getActionDetails(program, sourceOperation);
    if (details) {
      return { operation: sourceOperation, details };
    }
    sourceOperation = sourceOperation.sourceOperation;
  }
  return undefined;
}

export const useExplicitActionRule = createRule({
  name: "use-explicit-action",
  description: "Preserve the action segment when reusing actions.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/use-explicit-action",
  docs: fileRef.fromPackageRoot("src/rules/use-explicit-action.md"),
  messages: {
    changed: paramMessage`Reusing action "${"sourceOperationName"}" as "${"operationName"}" changes its suffix from "${"sourceSuffix"}" to "${"targetSuffix"}". Specify the intended suffix with @action("${"sourceSuffix"}").`,
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (
          isExcludedCoreType(context.program, operation) ||
          isTemplatedInterfaceOperation(operation) ||
          isTemplatedOperationSignature(operation) ||
          !operation.sourceOperation ||
          !isAutoRoute(context.program, operation)
        ) {
          return;
        }

        const action = getActionDetails(context.program, operation);
        const sourceAction = getSourceAction(context.program, operation);
        if (
          !action ||
          !sourceAction ||
          isTemplateDeclarationOrInstance(sourceAction.operation) ||
          (sourceAction.operation.interface &&
            isTemplateDeclarationOrInstance(sourceAction.operation.interface)) ||
          sourceAction.details.name === action.name
        ) {
          return;
        }

        const httpOperation = ignoreDiagnostics(getHttpOperation(context.program, operation));
        const sourceHttpOperation = ignoreDiagnostics(
          getHttpOperation(context.program, sourceAction.operation),
        );
        if (httpOperation.path === sourceHttpOperation.path) {
          return;
        }

        context.reportDiagnostic({
          messageId: "changed",
          format: {
            sourceOperationName: getOperationName(sourceAction.operation),
            operationName: getOperationName(operation),
            sourceSuffix: sourceAction.details.name,
            targetSuffix: action.name,
          },
          target: operation,
        });
      },
    };
  },
});
