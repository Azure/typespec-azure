import {
  createRule,
  fileRef,
  paramMessage,
  type Operation,
  type Program,
} from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";
import { getArmProviderNamespace } from "../namespace.js";
import { getArmResources, resolveArmResources } from "../resource.js";
import { isInternalTypeSpec } from "./utils.js";

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

function getNestedResourcePathValidity(program: Program) {
  const paths = new Map<string, boolean>();
  for (const resource of resolveArmResources(program).resources ?? []) {
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
    return {
      root() {
        const program = context.program;
        const nestedResourcePaths = getNestedResourcePathValidity(program);
        const trackedPathsByNamespace = new Map<string, Set<string>>();
        for (const resource of getArmResources(program)) {
          if (resource.kind !== "Tracked") continue;

          let paths = trackedPathsByNamespace.get(resource.armProviderNamespace);
          if (paths === undefined) {
            paths = new Set<string>();
            trackedPathsByNamespace.set(resource.armProviderNamespace, paths);
          }

          for (const operation of Object.values(resource.operations.lifecycle)) {
            if (
              operation !== undefined &&
              (operation.httpOperation.verb === "get" || operation.httpOperation.verb === "put")
            ) {
              paths.add(operation.path);
            }
          }
        }

        const [services] = getAllHttpServices(program);

        for (const service of services) {
          const serviceNamespace = getArmProviderNamespace(program, service.namespace);
          if (serviceNamespace === undefined) continue;

          const paths = new Map<string, { target: Operation; verbs: Set<string> }>();
          for (const httpOperation of service.operations) {
            if (isInternalTypeSpec(program, httpOperation.operation)) continue;

            let pathInfo = paths.get(httpOperation.path);
            if (pathInfo === undefined) {
              pathInfo = { target: httpOperation.operation, verbs: new Set<string>() };
              paths.set(httpOperation.path, pathInfo);
            }
            pathInfo.verbs.add(httpOperation.verb);
          }

          const trackedPaths = trackedPathsByNamespace.get(serviceNamespace);
          for (const [path, { target, verbs }] of paths) {
            const providerNamespaces = Array.from(
              path.matchAll(providerNamePattern),
              (match) => match[1],
            );
            const lastProviderNamespace = providerNamespaces.at(-1);
            const invalidProviderNamespaces = new Set(
              providerNamespaces.filter((namespace) => !providerPascalCasePattern.test(namespace)),
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

            if ([...verbs].some((verb) => resourceCrudVerbs.has(verb))) {
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

            if (
              trackedPaths?.has(path) &&
              (verbs.has("get") || verbs.has("put")) &&
              !resourceGroupScopePattern.test(path)
            ) {
              context.reportDiagnostic({ target, messageId: "tracked" });
            }
          }
        }
      },
    };
  },
});
