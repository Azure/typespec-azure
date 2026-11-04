import {
  createRule,
  fileRef,
  getPagingOperation,
  ignoreDiagnostics,
  isList,
  isTemplateDeclarationOrInstance,
} from "@typespec/compiler";
import { isExcludedCoreType, isTemplatedInterfaceOperation } from "./utils.js";

export const continuationTokenResponseRule = createRule({
  name: "continuation-token-response",
  description:
    "List operations with a continuation token parameter must return a continuation token.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/continuation-token-response",
  docs: fileRef.fromPackageRoot("src/rules/continuation-token-response.md"),
  messages: {
    default:
      "This list operation has a request @continuationToken but no response @continuationToken. If the service uses nextLink, remove the redundant token parameter when compatible; otherwise, annotate the token actually returned by the service.",
  },
  create(context) {
    return {
      operation(op) {
        if (
          !isList(context.program, op) ||
          isTemplateDeclarationOrInstance(op) ||
          isTemplatedInterfaceOperation(op) ||
          isExcludedCoreType(context.program, op)
        ) {
          return;
        }

        const paging = ignoreDiagnostics(getPagingOperation(context.program, op));
        if (paging?.input.continuationToken && !paging.output.continuationToken) {
          context.reportDiagnostic({ target: op });
        }
      },
    };
  },
});
