import { createRule } from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";

export const post201ResponseRule = createRule({
  name: "post-201-response",
  description: "Data-plane POST operations must not declare a 201 response.",
  severity: "warning",
  messages: {
    default: "Using post for a create operation is discouraged.",
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (resolveProviderNamespace(context.program, namespace) !== undefined) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "post") {
          return;
        }

        const has201Response = httpOperation.responses.some(
          (response) => response.statusCodes === 201,
        );
        if (!has201Response) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
        });
      },
    };
  },
});
