import {
  createRule,
  fileRef,
  isTemplateDeclarationOrInstance,
  paramMessage,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { getArmProviderNamespace } from "../namespace.js";
import { resolveArmResources, type ResolvedResource } from "../resource.js";
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
  let paths = pathsByNamespace.get(namespace);
  if (paths === undefined) {
    paths = new Set<string>();
    pathsByNamespace.set(namespace, paths);
  }
  if (paths.has(path)) return false;
  paths.add(path);
  return true;
}

function getNestedResourcePathValidity(resources: ResolvedResource[]) {
  const paths = new Map<string, boolean>();
  for (const resource of resources) {
    if (resource.parent === undefined) continue;

    const parentPath = resource.parent.resourceInstancePath.replace(/\/$/, "");
    const resourcePath = resource.resourceInstancePath.replace(/\/$/, "");
    const childSegments = resourcePath
      .slice(parentPath.length)
      .split("/")
      .filter((segment) => segment.length > 0);
    const childType = resource.resourceType.types.at(-1);
    const childName = childSegments[1];
    const isSingletonName =
      resource.singleton !== undefined &&
      (Array.isArray(resource.singleton.keyValue)
        ? resource.singleton.keyValue
        : [resource.singleton.keyValue]
      ).some((value) => value.toLowerCase() === childName?.toLowerCase());
    const isValid =
      resourcePath.toLowerCase().startsWith(`${parentPath.toLowerCase()}/`) &&
      childSegments.length === 2 &&
      childSegments[0].toLowerCase() === childType?.toLowerCase() &&
      ((childName !== undefined && /^\{[^{}]+\}$/.test(childName)) || isSingletonName);
    paths.set(
      resource.resourceInstancePath,
      (paths.get(resource.resourceInstancePath) ?? true) && isValid,
    );
  }
  return paths;
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
    const nestedResourcePaths = new Map<string, boolean>();
    const trackedPathsByNamespace = new Map<string, Set<string>>();
    const checkedProviderPaths = new Map<string, Set<string>>();
    const checkedResourcePaths = new Map<string, Set<string>>();
    const checkedTrackedPaths = new Map<string, Set<string>>();

    return {
      root(program) {
        const resources = resolveArmResources(program).resources ?? [];
        for (const [path, isValid] of getNestedResourcePathValidity(resources)) {
          nestedResourcePaths.set(path, isValid);
        }

        for (const resource of resources) {
          if (resource.kind !== "Tracked") continue;

          let paths = trackedPathsByNamespace.get(resource.providerNamespace);
          if (paths === undefined) {
            paths = new Set<string>();
            trackedPathsByNamespace.set(resource.providerNamespace, paths);
          }

          for (const operations of Object.values(resource.operations.lifecycle)) {
            for (const operation of operations ?? []) {
              if (
                operation.httpOperation.verb === "get" ||
                operation.httpOperation.verb === "put"
              ) {
                paths.add(operation.path);
              }
            }
          }
        }
      },
      operation(operation) {
        const program = context.program;
        if (
          isTemplateDeclarationOrInstance(operation) ||
          isTemplatedInterfaceOperation(operation) ||
          isInternalTypeSpec(program, operation)
        ) {
          return;
        }

        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (namespace === undefined) return;

        const serviceNamespace = getArmProviderNamespace(program, namespace);
        if (serviceNamespace === undefined) return;

        const [httpOperation] = getHttpOperation(program, operation);
        const { path, verb } = httpOperation;

        if (markPathSeen(checkedProviderPaths, serviceNamespace, path)) {
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
              target: operation,
              messageId: "providerCase",
              format: { namespaces: [...invalidProviderNamespaces].join(", "), path },
            });
          }

          if (lastProviderNamespace !== undefined && lastProviderNamespace !== serviceNamespace) {
            context.reportDiagnostic({
              target: operation,
              messageId: "providerNamespace",
              format: {
                pathNamespace: lastProviderNamespace,
                path,
                serviceNamespace,
              },
            });
          }
        }

        if (
          resourceCrudVerbs.has(verb) &&
          markPathSeen(checkedResourcePaths, serviceNamespace, path)
        ) {
          if (!resourceTypePattern.test(path)) {
            context.reportDiagnostic({ target: operation, messageId: "resourceType" });
          }

          const knownNestedPathIsValid = nestedResourcePaths.get(path);
          if (
            knownNestedPathIsValid === false ||
            (knownNestedPathIsValid === undefined &&
              invalidNestedPatterns.some((pattern) => pattern.test(path)))
          ) {
            context.reportDiagnostic({ target: operation, messageId: "nested" });
          }
        }

        const trackedPaths = trackedPathsByNamespace.get(serviceNamespace);
        if (
          (verb === "get" || verb === "put") &&
          trackedPaths?.has(path) &&
          !resourceGroupScopePattern.test(path) &&
          markPathSeen(checkedTrackedPaths, serviceNamespace, path)
        ) {
          context.reportDiagnostic({ target: operation, messageId: "tracked" });
        }
      },
    };
  },
});
