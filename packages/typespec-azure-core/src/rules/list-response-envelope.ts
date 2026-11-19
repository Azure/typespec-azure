import {
  createRule,
  fileRef,
  getPagingOperation,
  isList,
  isTemplateDeclarationOrInstance,
} from "@typespec/compiler";
import { isExcludedCoreType, isTemplatedInterfaceOperation } from "./utils.js";

export const listResponseEnvelopeRule = createRule({
  name: "list-response-envelope",
  description: "Review list operations with a request continuation token but no response token.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/list-response-envelope",
  docs: fileRef.fromPackageRoot("src/rules/list-response-envelope.md"),
  messages: {
    continuationToken:
      "This list operation has a request @continuationToken but no response @continuationToken. Review the SDK paging contract: when the response uses @nextLink, the pager may resume with a URL rather than the raw request token.",
  },
  create(context) {
    return {
      operation(operation) {
        if (
          !isList(context.program, operation) ||
          isTemplateDeclarationOrInstance(operation) ||
          isTemplatedInterfaceOperation(operation) ||
          isExcludedCoreType(context.program, operation)
        ) {
          return;
        }
        const [paging] = getPagingOperation(context.program, operation);
        if (paging?.input.continuationToken && !paging.output.continuationToken) {
          context.reportDiagnostic({ target: operation, messageId: "continuationToken" });
        }
      },
    };
  },
});
