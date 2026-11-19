import { createRule, fileRef, isList, isTemplateDeclarationOrInstance } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const listOperationMissing200ResponseRule = createRule({
  name: "list-operation-missing-200-response",
  description: "List operations must define a 200 response.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/list-operation-missing-200-response",
  docs: fileRef.fromPackageRoot("src/rules/list-operation-missing-200-response.md"),
  messages: {
    default: "List operations must define a 200 response.",
  },
  create(context) {
    return {
      operation: (operation) => {
        if (
          isTemplateDeclarationOrInstance(operation) ||
          (operation.interface && isTemplateDeclarationOrInstance(operation.interface)) ||
          !isList(context.program, operation)
        ) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (!httpOperation.responses.some((response) => response.statusCodes === 200)) {
          context.reportDiagnostic({ target: operation });
        }
      },
    };
  },
});
