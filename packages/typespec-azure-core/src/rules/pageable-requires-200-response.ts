import {
  createRule,
  fileRef,
  getPagingOperation,
  isList,
  isTemplateDeclaration,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const pageableRequires200ResponseRule = createRule({
  name: "pageable-requires-200-response",
  description: "Next-link pageable operations must define a 200 response.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/pageable-requires-200-response",
  docs: fileRef.fromPackageRoot("src/rules/pageable-requires-200-response.md"),
  messages: {
    default: "Next-link pageable operations must define a 200 response.",
  },
  create(context) {
    return {
      operation: (operation) => {
        if (
          !isList(context.program, operation) ||
          isTemplateDeclaration(operation) ||
          (operation.interface && isTemplateDeclaration(operation.interface))
        ) {
          return;
        }

        const [paging] = getPagingOperation(context.program, operation);
        if (paging?.output.nextLink === undefined) {
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
