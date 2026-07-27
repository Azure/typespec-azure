import { createRule, paramMessage } from "@typespec/compiler";
import { isArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation } from "@typespec/http";

export const extensionResourcePathPatternRule = createRule({
  name: "extension-resource-path-pattern",
  description:
    "ARM extension resource paths must use {scope}/providers/... instead of hardcoding the parent scope.",
  severity: "warning",
  messages: {
    default:
      paramMessage`Extension resource path '${"path"}' should use {scope}/providers/... instead of hardcoding the parent scope.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (!isArmProviderNamespace(context.program, namespace)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (countProviderSegments(httpOperation.path) <= 1) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
          format: {
            path: httpOperation.path,
          },
        });
      },
    };
  },
});

function countProviderSegments(path: string): number {
  return path.split("/providers/").length - 1;
}
