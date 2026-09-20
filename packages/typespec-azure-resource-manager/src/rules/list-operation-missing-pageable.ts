import {
  createRule,
  fileRef,
  getPagingOperation,
  isList,
  isTemplateDeclaration,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { getArmProviderNamespace } from "../namespace.js";
import { isCollectionPath } from "./utils.js";

export const listOperationMissingPageableRule = createRule({
  name: "list-operation-missing-pageable",
  docs: fileRef.fromPackageRoot("src/rules/list-operation-missing-pageable.md"),
  description: "ARM GET operations on list paths must define TypeSpec paging metadata.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/list-operation-missing-pageable",
  messages: {
    default:
      "This GET operation uses a collection route but does not define TypeSpec paging metadata. Use an ARM list operation template or add `@list` with `@pageItems` and `@nextLink`.",
  },
  create(context) {
    return {
      operation: (operation) => {
        if (
          isTemplateDeclaration(operation) ||
          (operation.interface !== undefined && isTemplateDeclaration(operation.interface))
        ) {
          return;
        }

        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (
          namespace === undefined ||
          getArmProviderNamespace(context.program, namespace) === undefined
        ) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (
          httpOperation.verb !== "get" ||
          !isCollectionPath(httpOperation.path, {
            excludeTerminalPathParameter: true,
            excludeDefaultSegment: true,
          })
        ) {
          return;
        }

        const [pagingOperation] = getPagingOperation(context.program, operation);
        if (isList(context.program, operation) && pagingOperation?.output.nextLink !== undefined) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
        });
      },
    };
  },
});
