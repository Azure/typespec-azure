import {
  createRule,
  fileRef,
  getNamespaceFullName,
  ignoreDiagnostics,
  listServices,
  paramMessage,
  type Interface,
  type Model,
  type Namespace,
  type Operation,
  type Program,
} from "@typespec/compiler";
import { getAllHttpServices, getHttpOperation } from "@typespec/http";
import {
  findVersionedNamespace,
  getAddedOnVersions,
  getRemovedOnVersions,
  getVersion,
  resolveVersions,
  type Version,
  type VersionResolution,
} from "@typespec/versioning";
import { getArmResourceOperationList } from "../operations.js";
import { getArmResources } from "../resource.js";

export const trackedResourceMissingOperationsRule = createRule({
  name: "tracked-resource-missing-operations",
  description: "Tracked ARM resources must provide PUT and PATCH operations.",
  docs: fileRef.fromPackageRoot("src/rules/tracked-resource-missing-operations.md"),
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/tracked-resource-missing-operations",
  severity: "warning",
  messages: {
    missingPut: paramMessage`Tracked resource '${"name"}' must have a PUT operation.`,
    missingPatch: paramMessage`Tracked resource '${"name"}' must have a PATCH operation.`,
    missingPutVersions: paramMessage`Tracked resource '${"name"}' must have a PUT operation for ${"versions"}.`,
    missingPatchVersions: paramMessage`Tracked resource '${"name"}' must have a PATCH operation for ${"versions"}.`,
  },
  create(context) {
    return {
      root: (program) => {
        const services = listServices(program).length > 0 ? getAllHttpServices(program)[0] : [];
        for (const resource of getArmResources(program)) {
          if (resource.kind !== "Tracked") continue;

          const operations = [...getArmResourceOperationList(program, resource.typespecType)].map(
            (operation) => ({
              ...operation,
              http: ignoreDiagnostics(getHttpOperation(program, operation.operation)),
            }),
          );
          const registered = new Map(
            operations.map((operation) => [operation.operation, operation]),
          );
          const serviceOperations = services.map((service) => ({
            namespace: service.namespace,
            operations: service.operations.flatMap((http) => {
              let source: Operation | undefined = http.operation;
              while (source !== undefined) {
                const match = registered.get(source);
                if (match) return [{ ...match, operation: http.operation, http }];
                source = source.sourceOperation;
              }
              return [];
            }),
          }));
          const applicableServices = serviceOperations.filter(
            (service) =>
              isWithin(resource.typespecType.namespace, service.namespace) ||
              service.operations.length > 0,
          );
          const fallback = resource.typespecType.namespace;
          const contexts =
            applicableServices.length > 0
              ? applicableServices
              : [{ namespace: fallback, operations }];
          const missingPut: string[] = [];
          const missingPatch: string[] = [];
          let missingUnversionedPut = false;
          let missingUnversionedPatch = false;
          for (const current of contexts) {
            const service = current.namespace;
            const versionRoot = service && (findVersionedNamespace(program, service) ?? service);
            const resolutions = versionRoot
              ? resolveVersions(program, versionRoot)
              : [{ rootVersion: undefined, versions: new Map() }];
            for (const resolution of resolutions) {
              if (!isAvailable(program, resource.typespecType, resolution)) continue;
              const available = current.operations.filter((operation) =>
                isAvailable(program, operation.operation, resolution),
              );
              const label = resolution.rootVersion?.value;
              const prefix = contexts.length > 1 && service ? getNamespaceFullName(service) : "";
              const version = prefix ? `${prefix}${label ? ` ${label}` : ""}` : label;
              if (
                !available.some(
                  (operation) =>
                    operation.kind === "createOrUpdate" && operation.http.verb === "put",
                )
              ) {
                if (version) missingPut.push(version);
                else missingUnversionedPut = true;
              }
              const identityPaths = available
                .filter(
                  (operation) =>
                    (operation.kind === "createOrUpdate" && operation.http.verb === "put") ||
                    operation.kind === "read" ||
                    operation.kind === "delete" ||
                    operation.kind === "checkExistence" ||
                    operation.kind === "update",
                )
                .map((operation) => operation.http.path);
              const itemPaths =
                identityPaths.length > 0
                  ? identityPaths
                  : available
                      .filter((operation) => operation.kind === "action")
                      .map((operation) => operation.http.path.replace(/\/[^/]+$/, ""));
              if (
                itemPaths.length === 0 ||
                itemPaths.some(
                  (itemPath) =>
                    !itemPath.toLowerCase().includes("privateendpointconnectionproxies") &&
                    !available.some(
                      (operation) =>
                        operation.kind === "update" &&
                        operation.http.verb === "patch" &&
                        normalizeItemPath(operation.http.path) === normalizeItemPath(itemPath),
                    ),
                )
              ) {
                if (version) missingPatch.push(version);
                else missingUnversionedPatch = true;
              }
            }
          }
          reportMissing(missingPut, missingUnversionedPut, "put");
          reportMissing(missingPatch, missingUnversionedPatch, "patch");

          function reportMissing(versions: string[], unversioned: boolean, verb: "put" | "patch") {
            if (versions.length === 0 && !unversioned) return;
            if (versions.length === 0) {
              context.reportDiagnostic({
                target: resource.typespecType,
                messageId: verb === "put" ? "missingPut" : "missingPatch",
                format: { name: resource.name },
              });
            } else {
              context.reportDiagnostic({
                target: resource.typespecType,
                messageId: verb === "put" ? "missingPutVersions" : "missingPatchVersions",
                format: { name: resource.name, versions: versions.join(", ") },
              });
            }
          }
        }
      },
    };
  },
});

function normalizeItemPath(path: string): string {
  return path.replace(/\{[^{}]+\}/g, "{}").toLowerCase();
}

function isAvailable(
  program: Program,
  type: Model | Operation | Interface,
  resolution: VersionResolution,
): boolean {
  const added = getAddedOnVersions(program, type) ?? [];
  const removed = getRemovedOnVersions(program, type) ?? [];
  // Availability maps can omit metadata inherited from a parent versioned namespace.
  const namespaces = new Set([...added, ...removed].map((version) => version.namespace));
  for (const namespace of namespaces) {
    const selected = resolution.versions.get(namespace);
    const versions = selected ? [selected] : (getVersion(program, namespace)?.getVersions() ?? []);
    const states = versions.map((version) => {
      const events: { version: Version; added: boolean }[] = [
        ...added
          .filter((entry) => entry.namespace === namespace)
          .map((entry) => ({ version: entry, added: true })),
        ...removed
          .filter((entry) => entry.namespace === namespace)
          .map((entry) => ({ version: entry, added: false })),
      ].sort((a, b) => a.version.index - b.version.index);
      let available = events[0]?.added === false;
      for (const event of events) {
        if (event.version.index > version.index) break;
        available = event.added;
      }
      return available;
    });
    if (type.kind === "Model" ? !states.some(Boolean) : !states.every(Boolean)) {
      return false;
    }
  }
  return (
    type.kind !== "Operation" || !type.interface || isAvailable(program, type.interface, resolution)
  );
}

function isWithin(namespace: Namespace | undefined, ancestor: Namespace): boolean {
  for (let current = namespace; current; current = current.namespace) {
    if (current === ancestor) return true;
  }
  return false;
}
