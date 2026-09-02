import { getArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { createRule, getPagingOperation, isList, isTemplateDeclaration } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { getExtensions } from "@typespec/openapi";

export const xmsPageableForListCallsRule = createRule({
  name: "xms-pageable-for-list-calls",
  description: "ARM GET operations on list paths must emit x-ms-pageable metadata.",
  severity: "warning",
  messages: {
    default:
      "This GET operation uses a collection route but does not emit `x-ms-pageable`. Use an ARM list operation template, or add `@list` and annotate the response with `@pageItems` and `@nextLink`.",
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
        if (httpOperation.verb !== "get" || !isCollectionGetPath(httpOperation.path)) {
          return;
        }

        const pageableExtension = getExtensions(context.program, operation).get("x-ms-pageable");
        if (pageableExtension) {
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

function isCollectionGetPath(path: string): boolean {
  if (!path.includes(".") || path.endsWith("}") || path.endsWith("/default")) {
    return false;
  }

  const providerTail = path.split(".").at(-1);
  return (
    providerTail !== undefined &&
    providerTail.includes("/") &&
    providerTail.split("/").length % 2 === 0
  );
}
