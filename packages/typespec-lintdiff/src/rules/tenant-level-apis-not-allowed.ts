import { getArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { createRule, paramMessage } from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";

export const tenantLevelAPIsNotAllowedRule = createRule({
  name: "tenant-level-apis-not-allowed",
  description:
    "ARM PUT operations whose resolved paths begin with '/providers' are not allowed, except paths ending in '/operations'.",
  severity: "warning",
  messages: {
    default: paramMessage`\
'${"name"}' is a tenant level api. Tenant level APIs are strongly discouraged \
and subscription or resource group level APIs are preferred instead. Please note that these APIs require a \
review from the security RBAC team during manifest check-in. For details, refer to the Manifest security review \
process: https://eng.ms/docs/microsoft-security/identity/auth-authz/access-control-managed-identityacmi/policy-administration-service/pas-wiki/livesite/security/manifest`,
  },
  create(context) {
    return {
      root: (program) => {
        const [services] = getAllHttpServices(program);
        for (const service of services) {
          if (!getArmProviderNamespace(program, service.namespace)) {
            continue;
          }

          for (const httpOperation of service.operations) {
            if (httpOperation.verb === "put" && isTenantPutPath(httpOperation.path)) {
              context.reportDiagnostic({
                target: httpOperation.operation,
                format: { name: httpOperation.operation.name },
              });
            }
          }
        }
      },
    };
  },
});

function isTenantPutPath(path: string): boolean {
  return path.startsWith("/providers") && !path.endsWith("/operations");
}
