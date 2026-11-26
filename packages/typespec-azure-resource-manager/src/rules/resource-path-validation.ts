import {
  createRule,
  fileRef,
  isTemplateDeclarationOrInstance,
  paramMessage,
  type Interface,
  type Operation,
} from "@typespec/compiler";
import {
  createMetadataInfo,
  getHttpOperation,
  resolveRequestVisibility,
  Visibility,
  type HttpOperation,
  type HttpOperationResponse,
  type HttpPayloadBody,
} from "@typespec/http";
import { getArmProviderNamespace } from "../namespace.js";
import { resolveArmResources, type ResolvedResource } from "../resource.js";
import { walkJsonProperties } from "./model-utils.js";
import { isInternalTypeSpec, isTemplatedInterfaceOperation } from "./utils.js";

const resourceTypePattern = /^.*\/providers\/\w+\.\w+\/\w+.*/i;
const resourceGroupScopePattern =
  /^\/subscriptions\/\{\w+\}\/resourceGroups\/\{\w+\}\/providers\/.+/i;
const invalidNestedPatterns = [
  /^.*\/providers\/\w+\.\w+\/\w+\/\{\w+\}(?:\/\w+\/(?!default)\w+){1,2}$/i,
  /^.*\/providers\/\w+\.\w+(?:\/\w+\/(default|\{\w+\})){1,2}(?:\/\w+\/(?!default)\w+)+$/i,
  /^.*\/providers\/\w+\.\w+\/\w+\/(?:\/\w+\/(default|\{\w+\})){0,3}\{\w+\}(?:\/\{\w+\})+.*$/i,
  /^.*\/providers\/\w+\.\w+(?:\/\w+\/(default|\{\w+\})){0,2}(?:\/\w+\/(?!default)\w+)+\/\{\w+\}.*$/i,
];
const providerNamePattern = /providers\/([\w.]+)/g;
const providerPascalCasePattern = /^[A-Z][a-z0-9]+(.([A-Z]{1,3}[a-z0-9]+)+[A-Z]{0,2})+$/;
const resourceCrudVerbs = new Set(["get", "put", "patch", "delete"]);

function markPathSeen(pathsByNamespace: Map<string, Set<string>>, namespace: string, path: string) {
  const paths = getOrCreatePathSet(pathsByNamespace, namespace);
  if (paths.has(path)) return false;
  paths.add(path);
  return true;
}

function getOrCreatePathSet(pathsByNamespace: Map<string, Set<string>>, namespace: string) {
  let paths = pathsByNamespace.get(namespace);
  if (paths === undefined) {
    paths = new Set<string>();
    pathsByNamespace.set(namespace, paths);
  }
  return paths;
}

function isValidNestedResourcePath(resource: ResolvedResource): boolean {
  const [childType, childName] = resource.resourceInstancePath
    .split("/")
    .filter((segment) => segment.length > 0)
    .slice(-2);
  const expectedChildType = resource.resourceType.types.at(-1);
  if (
    expectedChildType === undefined ||
    childType?.toLowerCase() !== expectedChildType.toLowerCase()
  ) {
    return false;
  }

  return isResourceNameSegment(childName, resource);
}

function isResourceNameSegment(segment: string | undefined, resource: ResolvedResource): boolean {
  if (segment !== undefined && /^\{[^{}]+\}$/.test(segment)) return true;
  const singletonNames = resource.singleton?.keyValue;
  if (segment === undefined || singletonNames === undefined) return false;

  return (Array.isArray(singletonNames) ? singletonNames : [singletonNames]).some(
    (name) => name.toLowerCase() === segment.toLowerCase(),
  );
}

function getNestedResourcePathValidity(resources: ResolvedResource[]) {
  const paths = new Map<string, boolean>();
  for (const resource of resources) {
    if (resource.parent === undefined) continue;

    const isValid = isValidNestedResourcePath(resource);
    paths.set(
      resource.resourceInstancePath,
      (paths.get(resource.resourceInstancePath) ?? true) && isValid,
    );
  }
  return paths;
}

function firstSuccessfulResponse(responses: HttpOperationResponse[]) {
  const numeric = responses
    .filter(
      (response) =>
        typeof response.statusCodes === "number" &&
        response.statusCodes >= 200 &&
        response.statusCodes < 300,
    )
    .sort((a, b) => Number(a.statusCodes) - Number(b.statusCodes));
  return (
    numeric[0] ??
    responses.find(
      (response) =>
        typeof response.statusCodes === "object" &&
        response.statusCodes.start <= 299 &&
        response.statusCodes.end >= 200,
    )
  );
}

export const resourcePathValidationRule = createRule({
  name: "resource-path-validation",
  description: "ARM resource paths must use valid resource, provider, and scope segments.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/resource-path-validation",
  docs: fileRef.fromPackageRoot("src/rules/resource-path-validation.md"),
  messages: {
    resourceType:
      "The path for a GET, PUT, PATCH, or DELETE operation must contain a resource type after the provider namespace.",
    nested: "The path for a nested resource must follow the resource type and name pattern.",
    tracked:
      "Tracked resources must use paths under /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}.",
    providerCase: paramMessage`Provider namespace '${"namespaces"}' in path '${"path"}' must use PascalCase.`,
    providerNamespace: paramMessage`The last provider namespace '${"pathNamespace"}' in path '${"path"}' must match the ARM service namespace '${"serviceNamespace"}'.`,
  },
  create(context) {
    let nestedResourcePaths = new Map<string, boolean>();
    const metadata = createMetadataInfo(context.program);
    const checkedProviderPaths = new Map<string, Set<string>>();
    const checkedResourcePaths = new Map<string, Set<string>>();
    const checkedTrackedPaths = new Map<string, Set<string>>();

    function checkProviderPath(
      target: Operation | Interface,
      path: string,
      serviceNamespace: string,
    ) {
      if (!markPathSeen(checkedProviderPaths, serviceNamespace, path)) return;

      const providerNamespaces = Array.from(
        path.matchAll(providerNamePattern),
        (match) => match[1],
      );
      const lastProviderNamespace = providerNamespaces.at(-1);
      const invalidProviderNamespaces = new Set(
        providerNamespaces.filter((provider) => !providerPascalCasePattern.test(provider)),
      );

      if (invalidProviderNamespaces.size > 0) {
        context.reportDiagnostic({
          target,
          messageId: "providerCase",
          format: { namespaces: [...invalidProviderNamespaces].join(", "), path },
        });
      }

      if (lastProviderNamespace !== undefined && lastProviderNamespace !== serviceNamespace) {
        context.reportDiagnostic({
          target,
          messageId: "providerNamespace",
          format: {
            pathNamespace: lastProviderNamespace,
            path,
            serviceNamespace,
          },
        });
      }
    }

    function checkResourcePath(
      target: Operation | Interface,
      path: string,
      verb: string,
      serviceNamespace: string,
    ) {
      if (
        !resourceCrudVerbs.has(verb) ||
        !markPathSeen(checkedResourcePaths, serviceNamespace, path)
      ) {
        return;
      }

      if (!resourceTypePattern.test(path)) {
        context.reportDiagnostic({ target, messageId: "resourceType" });
      }

      const knownNestedPathIsValid = nestedResourcePaths.get(path);
      if (
        knownNestedPathIsValid === false ||
        (knownNestedPathIsValid === undefined &&
          invalidNestedPatterns.some((pattern) => pattern.test(path)))
      ) {
        context.reportDiagnostic({ target, messageId: "nested" });
      }
    }

    function checkTrackedResourcePath(
      target: Operation | Interface,
      operation: HttpOperation,
      serviceNamespace: string,
    ) {
      const { path, verb } = operation;
      if (
        (verb !== "get" && verb !== "put") ||
        (resourceGroupScopePattern.test(path) &&
          !invalidNestedPatterns.some((pattern) => pattern.test(path)))
      ) {
        return;
      }

      const response = verb === "get" ? firstSuccessfulResponse(operation.responses) : undefined;
      const body =
        verb === "put"
          ? operation.parameters.body
          : response?.responses.findLast((content) => content.body !== undefined)?.body;
      const visibility =
        verb === "put"
          ? resolveRequestVisibility(context.program, operation.operation, verb)
          : Visibility.Read;
      if (
        hasLocation(body, visibility) &&
        markPathSeen(checkedTrackedPaths, serviceNamespace, path)
      ) {
        context.reportDiagnostic({ target, messageId: "tracked" });
      }
    }

    function hasLocation(body: HttpPayloadBody | undefined, visibility: Visibility): boolean {
      if (body?.bodyKind !== "single" || body.type.kind !== "Model") return false;
      for (const [name, property] of walkJsonProperties(context.program, body.type)) {
        if (
          name === "location" &&
          metadata.isPayloadProperty(property, visibility, body.isExplicit)
        ) {
          return true;
        }
      }
      return false;
    }

    return {
      root(program) {
        const resources = resolveArmResources(program).resources ?? [];
        nestedResourcePaths = getNestedResourcePathValidity(resources);
      },
      operation(target) {
        const program = context.program;
        if (
          isTemplateDeclarationOrInstance(target) ||
          isTemplatedInterfaceOperation(target) ||
          isInternalTypeSpec(program, target.interface ?? target)
        ) {
          return;
        }

        const namespace = target.interface?.namespace ?? target.namespace;
        if (namespace === undefined) return;

        const serviceNamespace = getArmProviderNamespace(program, namespace);
        if (serviceNamespace === undefined) return;

        const [httpOperation] = getHttpOperation(program, target);
        const { path, verb } = httpOperation;
        // Inherited operations retain library source namespaces, so report on their owning interface.
        const diagnosticTarget = isInternalTypeSpec(program, target)
          ? (target.interface ?? target)
          : target;

        checkProviderPath(diagnosticTarget, path, serviceNamespace);
        checkResourcePath(diagnosticTarget, path, verb, serviceNamespace);
        checkTrackedResourcePath(diagnosticTarget, httpOperation, serviceNamespace);
      },
    };
  },
});
