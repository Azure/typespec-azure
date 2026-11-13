import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { createRule, fileRef, listOperationsIn, listServices } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

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
    const globalNamespace = context.program.getGlobalNamespaceType();
    const services = listServices(context.program).map((service) => service.type);
    const serviceOperations = new Set(
      (services.length > 0 ? services : [globalNamespace]).flatMap((namespace) =>
        listOperationsIn(namespace, { recursive: namespace !== globalNamespace }),
      ),
    );
    return {
      operation(op) {
        if (!serviceOperations.has(op)) {
          return;
        }
        const [httpOperation] = getHttpOperation(context.program, op);
        if (httpOperation.verb !== "get") {
          return;
        }
        if (getLroMetadata(context.program, op) !== undefined) {
          context.reportDiagnostic({ target: op });
        }
      },
    };
  },
});
