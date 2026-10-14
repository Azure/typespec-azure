import {
  createRule,
  fileRef,
  isTemplateDeclarationOrInstance,
  paramMessage,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { isTemplatedInterfaceOperation } from "./utils.js";

export const useScopeForExtensionRoutingRule = createRule({
  name: "use-scope-for-extension-routing",
  docs: fileRef.fromPackageRoot("src/rules/use-scope-for-extension-routing.md"),
  description: "Require scope-based paths when explicitly enabled for RPaaS extension routing.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-scope-for-extension-routing/",
  messages: {
    default: paramMessage`RPaaS extension resource path '${"path"}' must use {scope}/providers/... instead of hardcoding the parent scope.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        if (
          isTemplateDeclarationOrInstance(operation) ||
          isTemplatedInterfaceOperation(operation)
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
