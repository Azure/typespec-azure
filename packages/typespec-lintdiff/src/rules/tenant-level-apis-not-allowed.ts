import { createRule, paramMessage } from "@typespec/compiler";
import {
  getArmResources,
  getResourceBaseType,
  ResourceBaseType,
  type ArmResourceDetails,
  type ArmResourceOperation,
} from "@azure-tools/typespec-azure-resource-manager";

export const tenantLevelAPIsNotAllowedRule = createRule({
  name: "tenant-level-apis-not-allowed",
  description: "Tenant ARM resource PUT operations are not allowed.",
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
        for (const armResource of getArmResources(program)) {
          if (
            getResourceBaseType(program, armResource.typespecType) !==
            ResourceBaseType.Tenant
          ) {
            continue;
          }

          for (const armResourceOperation of getAllResourceOperations(
            armResource,
          )) {
            if (
              armResourceOperation.httpOperation.verb === "put" &&
              isTenantPutPath(armResourceOperation.path)
            ) {
              context.reportDiagnostic({
                target: armResourceOperation.operation,
                format: { name: armResourceOperation.name },
              });
            }
          }
        }
      },
    };
  },
});

function getAllResourceOperations(
  resource: ArmResourceDetails,
): Array<ArmResourceOperation> {
  return [
    ...Object.values(resource.operations.lifecycle),
    ...Object.values(resource.operations.lists),
    ...Object.values(resource.operations.actions),
  ];
}

function isTenantPutPath(path: string): boolean {
  return path.startsWith("/providers/") && !path.endsWith("/operations");
}
