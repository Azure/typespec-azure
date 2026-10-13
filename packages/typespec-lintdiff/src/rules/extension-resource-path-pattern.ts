import {
  createRule,
  isTemplateDeclaration,
  isTemplateDeclarationOrInstance,
  paramMessage,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const extensionResourcePathPatternRule = createRule({
  name: "extension-resource-path-pattern",
  description: "Require scope-based paths when explicitly enabled for RPaaS extension routing.",
  severity: "warning",
  messages: {
    default: paramMessage`RPaaS extension resource path '${"path"}' must use {scope}/providers/... instead of hardcoding the parent scope.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        if (
          isTemplateDeclarationOrInstance(operation) ||
          (operation.interface !== undefined && isTemplateDeclaration(operation.interface))
        ) {
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
