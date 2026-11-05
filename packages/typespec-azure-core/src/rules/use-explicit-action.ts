import {
  createRule,
  fileRef,
  getNamespaceFullName,
  paramMessage,
  type Operation,
  type Program,
} from "@typespec/compiler";
import { getOperationVerb } from "@typespec/http";
import { getActionDetails, type ActionDetails } from "@typespec/rest";
import { isExcludedCoreType, isTemplatedInterfaceOperation } from "./utils.js";

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

function getImplicitActionName(operation: Operation): string {
  return operation.name[0].toLowerCase() + operation.name.slice(1);
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
  description: "Use an explicit suffix for POST actions.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/use-explicit-action",
  docs: fileRef.fromPackageRoot("src/rules/use-explicit-action.md"),
  messages: {
    default: paramMessage`POST action "${"operationName"}" should specify its action suffix with @action("${"actionName"}").`,
    changed: paramMessage`Reusing POST action "${"sourceOperationName"}" as "${"operationName"}" changes its suffix from "${"sourceSuffix"}" to "${"targetSuffix"}". Specify the intended suffix with @action("${"sourceSuffix"}").`,
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (
          isExcludedCoreType(context.program, operation) ||
          isTemplatedInterfaceOperation(operation) ||
          getOperationVerb(context.program, operation) !== "post"
        ) {
          return;
        }

        const action = getActionDetails(context.program, operation);
        if (action?.kind === "specified") {
          return;
        }

        const inheritedAction = getSourceAction(context.program, operation);
        const sourceAction =
          inheritedAction && getOperationVerb(context.program, inheritedAction.operation) === "post"
            ? inheritedAction
            : undefined;
        if (sourceAction?.details.kind === "specified") {
          return;
        }

        const targetSuffix = action?.name ?? getImplicitActionName(operation);
        if (sourceAction && sourceAction.details.name !== targetSuffix) {
          context.reportDiagnostic({
            messageId: "changed",
            format: {
              sourceOperationName: getOperationName(sourceAction.operation),
              operationName: getOperationName(operation),
              sourceSuffix: sourceAction.details.name,
              targetSuffix,
            },
            target: operation,
          });
          return;
        }

        if (action?.kind === "automatic" || sourceAction) {
          context.reportDiagnostic({
            messageId: "default",
            format: {
              operationName: getOperationName(operation),
              actionName: targetSuffix,
            },
            target: operation,
          });
        }
      },
    };
  },
});
