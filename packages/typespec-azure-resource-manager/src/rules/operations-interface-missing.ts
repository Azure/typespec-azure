import { createRule, isService, paramMessage } from "@typespec/compiler";

import { getArmProviderNamespace } from "../namespace.js";
import { isArmOperationsListInterface } from "../private.decorators.js";

/**
 * verify that the Arm Operations interface is included.
 */
export const operationsInterfaceMissingRule = createRule({
  name: "missing-operations-endpoint",
  severity: "warning",
  description: "Check for missing Operations interface.",
  messages: {
    default: paramMessage`Arm namespace ${"namespace"} is missing the Operations interface. Add "interface Operations extends Azure.ResourceManager.Operations {}".`,
  },
  create(context) {
    return {
      namespace: (namespace) => {
        if (!isService(context.program, namespace)) {
          return;
        }

        const providerName = getArmProviderNamespace(context.program, namespace);
        if (!providerName) {
          return;
        }
        for (const item of namespace.interfaces.values()) {
          if (isArmOperationsListInterface(context.program, item)) {
            return;
          }
        }
        context.reportDiagnostic({
          format: {
            namespace: namespace.name,
          },
          target: namespace,
        });
      },
    };
  },
});
