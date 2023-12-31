import { Namespace, createRule, getService } from "@typespec/compiler";
import { getAuthentication } from "@typespec/http";
import { isAzureSubNamespace, isExcludedCoreType } from "./utils.js";

export const authRequiredRule = createRule({
  name: "auth-required",
  description: "Enforce service authentication.",
  severity: "warning",
  messages: {
    default:
      "Provide an authentication scheme using the `@useAuth` decorator. See: https://azure.github.io/typespec-azure/docs/reference/azure-style-guide#security-definitions",
  },
  create(context) {
    return {
      namespace: (namespace: Namespace) => {
        if (isExcludedCoreType(context.program, namespace)) return;
        if (!isAzureSubNamespace(context.program, namespace)) return;

        const service = getService(context.program, namespace);
        if (!service) return;

        const auth = getAuthentication(context.program, namespace);
        if (!auth) {
          context.reportDiagnostic({
            target: namespace,
          });
        }
      },
    };
  },
});
