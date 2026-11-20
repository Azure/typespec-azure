import {
  createRule,
  fileRef,
  getLocationContext,
  isTemplateDeclarationOrInstance,
  isTemplateInstance,
  resolveEncodedName,
  walkPropertiesInherited,
  type Operation,
} from "@typespec/compiler";
import {
  createMetadataInfo,
  getHttpOperation,
  resolveRequestVisibility,
  Visibility,
  type HttpPayloadBody,
} from "@typespec/http";

const resourceTypePattern = /^.*\/providers\/\w+\.\w+\/\w+.*/i;
const resourceGroupScopePattern =
  /^\/subscriptions\/\{\w+\}\/resourceGroups\/\{\w+\}\/providers\/.+/i;
// These are the four upstream nested-path restrictions, not a general segment-count rule.
const invalidNestedPatterns = [
  /^.*\/providers\/\w+\.\w+\/\w+\/\{\w+\}(?:\/\w+\/(?!default)\w+){1,2}$/i,
  /^.*\/providers\/\w+\.\w+(?:\/\w+\/(default|\{\w+\})){1,2}(?:\/\w+\/(?!default)\w+)+$/i,
  /^.*\/providers\/\w+\.\w+\/\w+\/(?:\/\w+\/(default|\{\w+\})){0,3}\{\w+\}(?:\/\{\w+\})+.*$/i,
  /^.*\/providers\/\w+\.\w+(?:\/\w+\/(default|\{\w+\})){0,2}(?:\/\w+\/(?!default)\w+)+\/\{\w+\}.*$/i,
];

export const resourcePathValidationRule = createRule({
  name: "resource-path-validation",
  description:
    "ARM resource paths must contain a resource type and use valid nested and tracked resource paths.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/resource-path-validation",
  docs: fileRef.fromPackageRoot("src/rules/resource-path-validation.md"),
  messages: {
    resourceType:
      "The path for a GET, PUT, PATCH, or DELETE operation must contain a resource type after the provider namespace.",
    nested: "The path for a nested resource must follow the resource type and name pattern.",
    tracked: "A location-bearing resource path must be under a subscription and resource group.",
  },
  create(context) {
    const program = context.program;
    const metadata = createMetadataInfo(program);

    function hasLocation(body: HttpPayloadBody | undefined, visibility: Visibility): boolean {
      if (body?.bodyKind !== "single" || body.type.kind !== "Model") return false;
      return [...walkPropertiesInherited(body.type)].some(
        (property) =>
          resolveEncodedName(program, property, "application/json") === "location" &&
          metadata.isPayloadProperty(property, visibility, body.isExplicit),
      );
    }

    return {
      operation(operation: Operation) {
        const iface = operation.interface;
        if (
          isTemplateDeclarationOrInstance(operation) ||
          (iface
            ? isTemplateDeclarationOrInstance(iface) ||
              getLocationContext(program, iface).type !== "project"
            : isTemplateInstance(operation) ||
              getLocationContext(program, operation).type !== "project")
        )
          return;

        // Inherited operations keep their original declaration node; target the concrete interface.
        const target = iface && operation.node?.parent !== iface.node ? iface : operation;
        const http = getHttpOperation(program, operation)[0];
        if (!["get", "put", "patch", "delete"].includes(http.verb)) return;

        const path = http.path;
        if (!resourceTypePattern.test(path)) {
          context.reportDiagnostic({ target, messageId: "resourceType" });
        }
        const invalidNested = invalidNestedPatterns.some((pattern) => pattern.test(path));
        if (invalidNested) {
          context.reportDiagnostic({ target, messageId: "nested" });
        }

        let location = false;
        if (http.verb === "put") {
          location = hasLocation(
            http.parameters.body,
            resolveRequestVisibility(program, operation, http.verb),
          );
        } else if (http.verb === "get") {
          const firstSuccess = http.responses
            .filter(
              (response) =>
                typeof response.statusCodes === "number" &&
                response.statusCodes >= 200 &&
                response.statusCodes < 300,
            )
            .sort((a, b) => (a.statusCodes as number) - (b.statusCodes as number))[0];
          location =
            firstSuccess?.responses.some(({ body }) => hasLocation(body, Visibility.Read)) ?? false;
        }
        // A resource-group-scoped nested failure was already reported above.
        if (location && !resourceGroupScopePattern.test(path)) {
          context.reportDiagnostic({ target, messageId: "tracked" });
        }
      },
    };
  },
});
