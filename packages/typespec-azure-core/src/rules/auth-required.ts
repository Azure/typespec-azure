import { Namespace, createRule, fileRef, getService } from "@typespec/compiler";
import { getAuthentication } from "@typespec/http";

export const authRequiredRule = createRule({
  name: "auth-required",
  docs: fileRef.fromPackageRoot("src/rules/auth-required.md"),
  description: "Enforce service authentication.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/auth-required",
  messages: {
    default:
      "Provide an authentication scheme using the `@useAuth` decorator. See: https://azure.github.io/typespec-azure/docs/reference/azure-style-guide#security-definitions",
  },
  create(context) {
    return {
      namespace: (namespace: Namespace) => {
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
