import { createRule, fileRef, paramMessage } from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";
import { getArmProviderNamespace } from "../namespace.js";

export const noTenantLevelApisRule = createRule({
  name: "no-tenant-level-apis",
  docs: fileRef.fromPackageRoot("src/rules/no-tenant-level-apis.md"),
  severity: "warning",
  description:
    "ARM PUT operations whose resolved paths begin with '/providers' are not allowed, except paths ending in '/operations'.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/no-tenant-level-apis",
  messages: {
    default: paramMessage`Operation '${"name"}' defines a tenant-level ARM API. Prefer a subscription- or resource-group-level API instead.`,
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
            if (httpOperation.verb === "put" && isTenantLevelPutPath(httpOperation.path)) {
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

function isTenantLevelPutPath(path: string): boolean {
  return path.startsWith("/providers") && !path.endsWith("/operations");
}
