import { createRule, Interface, Namespace, paramMessage } from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { listClients } from "../decorators.js";

export const requireClientSuffixRule = createRule({
  name: "require-client-suffix",
  description: "Client names should end with 'Client'.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/require-client-suffix",
  messages: {
    default: paramMessage`Client name "${"name"}" must end with Client. Use @client({name: "...Client"}`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      {
        mutateNamespace: false,
      },
    );
    const clients = listClients(tcgcContext);
    return {
      namespace: (namespace: Namespace) => {
        const sdkClient = clients.find((x) => x.service === namespace);
        if (sdkClient && !sdkClient.name.endsWith("Client")) {
          context.reportDiagnostic({
            target: namespace,
            format: {
              name: sdkClient.name,
            },
          });
        }
      },
      interface: (interfaceType: Interface) => {
        const sdkClient = clients.find((x) => x.type === interfaceType);
        if (sdkClient && !sdkClient.name.endsWith("Client")) {
          context.reportDiagnostic({
            target: interfaceType,
            format: {
              name: sdkClient.name,
            },
          });
        }
      },
    };
  },
});
