import {
  Enum,
  Interface,
  isService,
  isTemplateDeclaration,
  isTemplateDeclarationOrInstance,
  Namespace,
  Operation,
} from "@typespec/compiler";
import {
  getAddedOnVersions,
  getRemovedOnVersions,
  getVersionDependencies,
  getVersions,
} from "@typespec/versioning";
import { getClientLocation, getClientNameOverride, isInScope } from "./decorators.js";
import { SdkClient, SdkOperationGroup, TCGCContext } from "./interfaces.js";
import {
  clientKey,
  clientLocationKey,
  getScopedDecoratorData,
  hasExplicitClientOrOperationGroup,
  listAllUserDefinedNamespaces,
  listScopedDecoratorData,
  omitOperation,
  operationGroupKey,
  removeVersionsLargerThanExplicitlySpecified,
} from "./internal-utils.js";
import { reportDiagnostic } from "./lib.js";
import { getLibraryName } from "./public-utils.js";

/**
 * Create TCGC client types and operation group types and prepare the cache for clients, operation groups and operations.
 *
 * @param context TCGCContext
 */
export function prepareClientAndOperationCache(context: TCGCContext): void {
  // initialize the caches
  context.__rawClientsOperationGroupsCache = new Map<
    Namespace | Interface | string,
    SdkClient | SdkOperationGroup
  >();
  context.__operationToClientCache = new Map<Operation, SdkClient | SdkOperationGroup>();
  context.__clientToOperationsCache = new Map<SdkOperationGroup | SdkClient, Operation[]>();

  // create clients
  const clients = getOrCreateClients(context);

  context.__packageVersions = new Map<Namespace, string[]>();
  context.__packageVersionEnum = new Map<Namespace, Enum | undefined>();
  // handle versioning with mutated types
  if (clients.length === 1 && Array.isArray(clients[0].service)) {
    // multi-service client
    const versionDependencies = getVersionDependencies(
      context.program,
      clients[0]!.type as Namespace,
    );
    for (const specificService of clients[0].service) {
      if (context.__packageVersions.has(specificService)) {
        continue;
      }

      const versions = getVersions(context.program, specificService)[1]?.getVersions();
      if (!versions) {
        context.__packageVersions.set(specificService, []);
        continue;
      }

      context.__packageVersionEnum.set(specificService, versions[0].enumMember.enum);

      const versionDependency = versionDependencies?.get(specificService);
      if (versionDependency && "name" in versionDependency) {
        let end = false;
        context.__packageVersions.set(
          specificService,
          versions
            .map((version) => version.value)
            .filter((v) => {
              if (end) return false;
              if (v === versionDependency.value) end = true;
              return true;
            }),
        );
      } else {
        context.__packageVersions.set(
          specificService,
          versions.map((version) => version.value),
        );
      }
    }
  } else if (clients.length > 0) {
    // single-service client
    const versions = getVersions(
      context.program,
      clients[0].service as Namespace,
    )[1]?.getVersions();

    if (!versions || versions.length === 0) {
      context.__packageVersions.set(clients[0].service as Namespace, []);
    } else {
      context.__packageVersionEnum.set(
        clients[0].service as Namespace,
        versions[0].enumMember.enum,
      );

      removeVersionsLargerThanExplicitlySpecified(context, versions);

      const filteredVersions = versions.map((version) => version.value);
      context.__packageVersions.set(clients[0].service as Namespace, filteredVersions);
    }
  }

  // create operation groups for each client
  for (const client of clients) {
    const groups: SdkOperationGroup[] = [];

    if (Array.isArray(client.service)) {
      for (const specificService of client.service) {
        createFirstLevelOperationGroup(context, specificService, specificService);
      }
    } else {
      createFirstLevelOperationGroup(context, client.type, client.service);
    }

    function createFirstLevelOperationGroup(
      context: TCGCContext,
      type: Namespace | Interface,
      service: Namespace | Namespace[],
    ) {
      // iterate client's interfaces and namespaces to find operation groups
      if (type.kind === "Namespace") {
        for (const subItem of type.namespaces.values()) {
          const og = createOperationGroup(context, subItem, `${client.name}`, service, client);
          if (og) {
            groups.push(og);
          }
        }
        for (const subItem of type.interfaces.values()) {
          if (isTemplateDeclaration(subItem)) {
            // Skip template interfaces
            continue;
          }
          const og = createOperationGroup(context, subItem, `${client.name}`, service, client);
          if (og) {
            groups.push(og);
          }
        }
      }
    }

    // build client's cache
    context.__rawClientsOperationGroupsCache.set(client.type, client);
    client.subOperationGroups = groups;
    context.__clientToOperationsCache.set(client, []);
  }

  // create operation group for `@clientLocation` of  string value
  // if no explicit `@client` or `@operationGroup`
  // TODO: need to handle multiple service cases
  if (!hasExplicitClientOrOperationGroup(context)) {
    const newOperationGroupNames = new Set<string>();
    [...listScopedDecoratorData(context, clientLocationKey).values()].map((target) => {
      if (typeof target === "string") {
        if (
          clients[0].subOperationGroups.some(
            (og) => og.type && getLibraryName(context, og.type) === target,
          )
        ) {
          // do not create a new operation group if it already exists
          return;
        }
        newOperationGroupNames.add(target);
      }
    });

    for (const ogName of newOperationGroupNames) {
      const og: SdkOperationGroup = {
        kind: "SdkOperationGroup",
        groupPath: `${clients[0].name}.${ogName}`,
        service: clients[0].service,
        subOperationGroups: [],
        parent: clients[0],
      };
      context.__rawClientsOperationGroupsCache.set(ogName, og);
      clients[0].subOperationGroups!.push(og);
      context.__clientToOperationsCache.set(og, []);
    }
  }

  // iterate all clients and operation groups and build a map of operations
  const queue: (SdkClient | SdkOperationGroup)[] = [...clients];
  while (queue.length > 0) {
    const group = queue.shift()!;
    if (group.type) {
      // operations directly under the group
      const operations = [...group.type.operations.values()];

      // when there is explicitly `@operationGroup` or `@client`
      // operations under namespace or interface that are not decorated with `@operationGroup` or `@client`
      // should be placed in the first accessor client or operation group
      if (group.type.kind === "Namespace" && hasExplicitClientOrOperationGroup(context)) {
        const innerQueue: Namespace[] = [group.type];
        while (innerQueue.length > 0) {
          const ns = innerQueue.shift()!;
          for (const subNs of ns.namespaces.values()) {
            if (!context.__rawClientsOperationGroupsCache.has(subNs)) {
              operations.push(...subNs.operations.values());
              innerQueue.push(subNs);
            }
          }
          for (const iface of ns.interfaces.values()) {
            if (!context.__rawClientsOperationGroupsCache.has(iface)) {
              operations.push(...iface.operations.values());
            }
          }
        }
      }

      // add operations
      for (const op of operations) {
        // skip operations that are not in scope
        if (!isInScope(context, op)) {
          continue;
        }

        // skip templated operations, omit operations (has override decorator)
        if (
          !isTemplateDeclarationOrInstance(op) &&
          !context.program.stateMap(omitOperation).get(op)
        ) {
          let pushGroup: SdkClient | SdkOperationGroup = group;
          const clientLocation = getClientLocation(context, op);
          if (clientLocation) {
            // operation with `@clientLocation` decorator is placed in another operation group
            if (context.__rawClientsOperationGroupsCache.has(clientLocation)) {
              pushGroup = context.__rawClientsOperationGroupsCache.get(clientLocation)!;
            } else {
              if (typeof clientLocation !== "string") {
                reportDiagnostic(context.program, {
                  code: "client-location-wrong-type",
                  target: op,
                });
              } else {
                reportDiagnostic(context.program, {
                  code: "client-location-duplicate",
                  target: clients[0].type,
                });
              }
            }
          }
          context.__clientToOperationsCache.get(pushGroup)!.push(op);
          context.__operationToClientCache.set(op, pushGroup);
        }
      }
    }
    queue.push(...group.subOperationGroups);
  }

  // omit empty client or operation groups
  if (!hasExplicitClientOrOperationGroup(context)) {
    const removeEmptyGroups = (group: SdkOperationGroup | SdkClient): boolean => {
      // recursively check and remove empty sub-operation groups
      group.subOperationGroups = group.subOperationGroups.filter((subGroup) => {
        const keep = removeEmptyGroups(subGroup);
        if (!keep) {
          context.__rawClientsOperationGroupsCache!.delete(subGroup.type!);
        }
        return keep;
      });

      // check if the group has operations or non-empty sub-operation groups
      const hasOperations = context.__clientToOperationsCache!.get(group)!.length > 0;
      const hasSubGroups = group.subOperationGroups?.length > 0;

      return hasOperations || hasSubGroups;
    };

    // start from the top-level clients and remove empty groups
    for (const client of clients) {
      const keepClient = removeEmptyGroups(client);
      if (!keepClient) {
        context.__rawClientsOperationGroupsCache.delete(client.type);
        context.__clientToOperationsCache.delete(client);
      }
    }
  }
}

/**
 * Check if a type is available in the current target API version.
 * Returns false if the type was @added in a later version or @removed in an earlier version.
 */
function isTypeAvailableInVersion(context: TCGCContext, type: Namespace | Interface): boolean {
  const apiVersion = context.apiVersion;
  // eslint-disable-next-line no-console
  console.error(`isTypeAvailableInVersion CALLED: type=${type.name}, apiVersion=${apiVersion}`);
  // If no specific API version is set, or "all"/"latest", include all types
  if (!apiVersion || apiVersion === "all" || apiVersion === "latest") {
    // eslint-disable-next-line no-console
    console.error(`  returning true (no specific version)`);
    return true;
  }

  // Get the service namespace to check versions
  // For interfaces, we need to find the enclosing versioned namespace
  let serviceNs: Namespace | undefined = type.kind === "Namespace" ? type : type.namespace;
  while (serviceNs) {
    const versionsResult = getVersions(context.program, serviceNs);
    if (versionsResult?.[1]?.getVersions()?.length) {
      break;
    }
    serviceNs = serviceNs.namespace;
  }
  if (!serviceNs) return true;

  const versionsResult = getVersions(context.program, serviceNs);
  const versions = versionsResult?.[1]?.getVersions();
  if (!versions || versions.length === 0) return true;

  // Build a version index map for comparison
  const versionIndex = new Map<string, number>();
  versions.forEach((v, i) => versionIndex.set(v.value, i));

  const targetIndex = versionIndex.get(apiVersion);
  if (targetIndex === undefined) return true; // Unknown version, include by default

  // Check @added decorator
  const addedVersions = getAddedOnVersions(context.program, type);
  // eslint-disable-next-line no-console
  console.log(
    `isTypeAvailableInVersion: type=${type.name}, apiVersion=${apiVersion}, addedVersions=${addedVersions?.map((v) => v.value)?.join(",") ?? "none"}`,
  );
  if (addedVersions && addedVersions.length > 0) {
    // Type was added in a specific version - check if target version is >= added version
    const addedVersion = addedVersions[0]; // Use first added version
    const addedIndex = versionIndex.get(addedVersion.value);
    // eslint-disable-next-line no-console
    console.log(`  addedIndex=${addedIndex}, targetIndex=${targetIndex}`);
    if (addedIndex !== undefined && targetIndex < addedIndex) {
      // Target version is before the type was added
      // eslint-disable-next-line no-console
      console.log(
        `  EXCLUDING ${type.name} (added in ${addedVersion.value}, targeting ${apiVersion})`,
      );
      return false;
    }
  }

  // Check @removed decorator
  const removedVersions = getRemovedOnVersions(context.program, type);
  if (removedVersions && removedVersions.length > 0) {
    // Type was removed in a specific version - check if target version is >= removed version
    const removedVersion = removedVersions[0]; // Use first removed version
    const removedIndex = versionIndex.get(removedVersion.value);
    if (removedIndex !== undefined && targetIndex >= removedIndex) {
      // Target version is at or after the type was removed
      return false;
    }
  }

  return true;
}

/**
 * Get or create the TCGC clients.
 * If user has explicitly defined `@client` then we will use those clients.
 * If user has not defined any `@client` then we will create a client for the first service namespace.
 *
 * @param context TCGCContext
 * @returns
 */
function getOrCreateClients(context: TCGCContext): SdkClient[] {
  const namespaces: Namespace[] = listAllUserDefinedNamespaces(context);

  // Build maps from type name to mutated type for name-based matching
  // This is needed because decorator data is stored with original types,
  // but we need to match against mutated types after versioning
  const mutatedNamespacesByName = new Map<string, Namespace>();
  const mutatedInterfacesByName = new Map<string, Interface>();
  for (const ns of namespaces) {
    mutatedNamespacesByName.set(ns.name, ns);
    for (const i of ns.interfaces.values()) {
      mutatedInterfacesByName.set(i.name, i);
    }
  }

  // First try direct lookup (works when no versioning mutation happened)
  const explicitClients: SdkClient[] = [];
  for (const ns of namespaces) {
    const clientData = getScopedDecoratorData(context, clientKey, ns);
    if (clientData && isTypeAvailableInVersion(context, ns)) {
      explicitClients.push(clientData);
    }
    for (const i of ns.interfaces.values()) {
      const clientData = getScopedDecoratorData(context, clientKey, i);
      if (clientData && isTypeAvailableInVersion(context, i)) {
        explicitClients.push(clientData);
      }
    }
  }

  // If direct lookup failed, try name-based matching
  // This handles the versioning case where decorator data is keyed by original types
  // but the namespaces/interfaces are mutated versions
  if (explicitClients.length === 0) {
    // Get all client data from the state map (keyed by original types)
    const allClientData = listScopedDecoratorData(context, clientKey);

    for (const [originalType, sdkClient] of allClientData.entries()) {
      // Find the corresponding mutated type by name
      let mutatedType: Namespace | Interface | undefined;
      if (originalType.kind === "Namespace") {
        mutatedType = mutatedNamespacesByName.get(originalType.name);
      } else if (originalType.kind === "Interface") {
        mutatedType = mutatedInterfacesByName.get(originalType.name);
      }

      // Only include clients whose types still exist after versioning mutation
      // (e.g., interfaces removed by @removed won't exist in the mutated tree)
      if (mutatedType) {
        // Check if the original type is available in the target API version
        // Types marked with @added(higherVersion) should be excluded when targeting a lower version
        if (!isTypeAvailableInVersion(context, originalType as Namespace | Interface)) {
          continue;
        }

        // Also remap the service namespace to the mutated version
        let mutatedService: Namespace | Namespace[] | undefined;
        const originalService = (sdkClient as SdkClient).service;

        if (Array.isArray(originalService)) {
          const remappedServices: Namespace[] = [];
          for (const svc of originalService) {
            const mutatedSvc = mutatedNamespacesByName.get(svc.name);
            if (mutatedSvc) {
              remappedServices.push(mutatedSvc);
            }
          }
          mutatedService = remappedServices.length > 0 ? remappedServices : undefined;
        } else {
          mutatedService = mutatedNamespacesByName.get(originalService.name);
        }

        if (mutatedService) {
          // Create a new client object with the mutated types
          explicitClients.push({
            ...(sdkClient as SdkClient),
            type: mutatedType,
            service: mutatedService,
          });
        }
      }
    }
  }

  if (explicitClients.length > 0) {
    if (explicitClients.some((client) => isArm(client.service))) {
      context.arm = true;
    }
    return explicitClients;
  }

  // if there is no explicit client, we will treat the first namespace with service decorator as client
  const serviceNamespaces: Namespace[] = namespaces.filter((ns) => isService(context.program, ns));
  if (serviceNamespaces.length >= 1) {
    const service = serviceNamespaces.shift()!;
    serviceNamespaces.map((ns) => {
      reportDiagnostic(context.program, {
        code: "multiple-services",
        target: ns,
      });
    });
    let originalName = service.name;
    const clientNameOverride = getClientNameOverride(context, service);
    if (clientNameOverride) {
      originalName = clientNameOverride;
    } else {
      originalName = service.name;
    }
    const clientName = originalName.endsWith("Client") ? originalName : `${originalName}Client`;
    context.arm = isArm(service);
    return [
      {
        kind: "SdkClient",
        name: clientName,
        service: service,
        type: service,
        subOperationGroups: [],
      },
    ];
  }

  return [];
}

/**
 * Create a TCGC operation group for the given type.
 * This function will also iterate through the type's namespaces and interfaces to build nested operation groups.
 *
 * @param context TCGCContext
 * @param type
 * @returns
 */
function createOperationGroup(
  context: TCGCContext,
  type: Namespace | Interface,
  groupPathPrefix: string,
  service: Namespace[] | Namespace,
  parent?: SdkClient | SdkOperationGroup,
): SdkOperationGroup | undefined {
  let operationGroup: SdkOperationGroup | undefined;
  if (hasExplicitClientOrOperationGroup(context)) {
    operationGroup = getScopedDecoratorData(context, operationGroupKey, type);
    if (operationGroup) {
      operationGroup.groupPath = `${groupPathPrefix}.${getLibraryName(context, type)}`;
      operationGroup.service = service;
      operationGroup.subOperationGroups = [];
      operationGroup.parent = parent;

      if (type.kind === "Namespace") {
        operationGroup.subOperationGroups =
          buildHierarchyOfOperationGroups(
            context,
            type,
            operationGroup.groupPath,
            service,
            operationGroup,
          ) ?? [];
      }
    }
  } else {
    // if there is no explicit client, we will treat non-client namespaces and all interfaces as operation group
    if (type.kind !== "Interface" || !isTemplateDeclaration(type)) {
      operationGroup = {
        kind: "SdkOperationGroup",
        type,
        groupPath: `${groupPathPrefix}.${getLibraryName(context, type)}`,
        service,
        subOperationGroups: [],
        parent,
      };
    }

    if (operationGroup && type.kind === "Namespace") {
      operationGroup.subOperationGroups =
        buildHierarchyOfOperationGroups(
          context,
          type,
          operationGroup.groupPath,
          service,
          operationGroup,
        ) ?? [];
    }
  }

  // build operation group's cache
  if (operationGroup) {
    context.__rawClientsOperationGroupsCache!.set(operationGroup.type!, operationGroup);
    context.__clientToOperationsCache!.set(operationGroup, []);
  }

  return operationGroup;
}

function buildHierarchyOfOperationGroups(
  context: TCGCContext,
  type: Namespace,
  groupPathPrefix: string,
  service: Namespace[] | Namespace,
  parent?: SdkClient | SdkOperationGroup,
): SdkOperationGroup[] | undefined {
  // build hierarchy of operation group
  const subOperationGroups: SdkOperationGroup[] = [];
  type.namespaces.forEach((ns) => {
    const subOperationGroup = createOperationGroup(context, ns, groupPathPrefix, service, parent);
    if (subOperationGroup) {
      subOperationGroups.push(subOperationGroup);
    }
  });
  type.interfaces.forEach((i) => {
    const subOperationGroup = createOperationGroup(context, i, groupPathPrefix, service, parent);
    if (subOperationGroup) {
      subOperationGroups.push(subOperationGroup);
    }
  });
  if (subOperationGroups.length > 0) {
    return subOperationGroups;
  }
  return undefined;
}

function isArm(service: Namespace[] | Namespace): boolean {
  if (Array.isArray(service)) {
    return service.some((s) => isArm(s));
  }
  return service.decorators.some(
    (decorator) => decorator.decorator.name === "$armProviderNamespace",
  );
}
