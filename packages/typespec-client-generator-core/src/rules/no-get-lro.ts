import { createRule, fileRef, listOperationsIn, listServices } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { markAsLroKey } from "../internal-utils.js";

export const noGetLroRule = createRule({
  name: "no-get-lro",
  description: "GET SDK operations must not be marked as long-running with Legacy.markAsLro.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/no-get-lro",
  docs: fileRef.fromPackageRoot("src/rules/no-get-lro.md"),
  messages: {
    default: "GET SDK operations must not be marked as long-running with Legacy.markAsLro.",
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
      operation(operation) {
        if (!serviceOperations.has(operation)) return;
        const marker: Record<string | symbol, unknown> | undefined = context.program
          .stateMap(markAsLroKey)
          .get(operation);
        // Common scope is a symbol; exclusion metadata and empty scope names are not markers.
        if (
          !marker ||
          !Reflect.ownKeys(marker).some((scope) => scope !== "" && marker[scope] === true)
        ) {
          return;
        }
        if (getHttpOperation(context.program, operation)[0].verb === "get") {
          context.reportDiagnostic({ target: operation });
        }
      },
    };
  },
});
