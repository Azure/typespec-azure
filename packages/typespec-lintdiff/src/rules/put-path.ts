import { createRule } from "@typespec/compiler";
import { isArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation } from "@typespec/http";

export const putPathRule = createRule({
  name: "put-path",
  description: "Data-plane PUT paths should end with a final path parameter.",
  severity: "warning",
  messages: {
    default: "The path for a put should have a final path parameter.",
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (isArmProviderNamespace(context.program, namespace)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "put" || httpOperation.path.endsWith("}")) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
        });
      },
    };
  },
});
