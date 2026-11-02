import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { createRule, fileRef, isTemplateDeclaration } from "@typespec/compiler";
import { getAllHttpServices, type HttpOperation } from "@typespec/http";
import { getExtensions } from "@typespec/openapi";
import { isTemplatedInterfaceOperation } from "./utils.js";

export const noGetLroRule = createRule({
  name: "no-get-lro",
  severity: "warning",
  description: "GET operations must not be long-running.",
  docs: fileRef.fromPackageRoot("src/rules/no-get-lro.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-get-lro",
  messages: {
    default: "GET operations must not be long-running. Use a non-GET operation to initiate an LRO.",
  },
  create(context) {
    let operations: Map<HttpOperation["operation"], HttpOperation> | undefined;
    return {
      operation(op) {
        if (isTemplateDeclaration(op) || isTemplatedInterfaceOperation(op)) {
          return;
        }
        operations ??= new Map(
          getAllHttpServices(context.program)[0].flatMap((service) =>
            service.operations.map((httpOperation) => [httpOperation.operation, httpOperation]),
          ),
        );
        if (operations.get(op)?.verb !== "get") {
          return;
        }
        const extensions = getExtensions(context.program, op);
        if (
          getLroMetadata(context.program, op) !== undefined ||
          extensions.get("x-ms-long-running-operation") === true ||
          extensions.get("x-ms-long-running-operation-options")
        ) {
          context.reportDiagnostic({ target: op });
        }
      },
    };
  },
});
