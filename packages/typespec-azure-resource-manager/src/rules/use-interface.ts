import { Operation, createRule, isTemplateInstance } from "@typespec/compiler";
import { SyntaxKind } from "@typespec/compiler/ast";
import {
  isSourceOperationResourceManagerInternal,
  isTemplatedInterfaceOperation,
} from "./utils.js";

export const useInterfaceRule = createRule({
  name: "use-interface",
  severity: "warning",
  description: "Validate ARM Resource operations are defined inside an interface declaration.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/use-interface",
  messages: {
    default: "All operations must be inside an interface declaration.",
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (
          !isSourceOperationResourceManagerInternal(operation) &&
          !isTemplateInstance(operation)
        ) {
          if (
            !isTemplatedInterfaceOperation(operation) &&
            (!operation.node?.parent ||
              operation.node.parent.kind !== SyntaxKind.InterfaceStatement)
          ) {
            context.reportDiagnostic({
              target: operation,
            });
          }
        }
      },
    };
  },
});
