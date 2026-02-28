import {
  compilerAssert,
  Enum,
  Interface,
  isService,
  isTemplateDeclaration,
  isTemplateDeclarationOrInstance,
  Namespace,
  Operation,
} from "@typespec/compiler";
import { unsafe_Realm } from "@typespec/compiler/experimental";
import { getVersionDependencies, getVersions } from "@typespec/versioning";
import { getClientLocation, getClientNameOverride, isInScope } from "./decorators.js";
import { SdkClient, TCGCContext } from "./interfaces.js";
import {
  clientKey,
  clientLocationKey,
  findServiceForOperation,
  getScopedDecoratorData,
  hasExplicitClient,
  listAllUserDefinedNamespaces,
  listScopedDecoratorData,
  omitOperation,
  removeVersionsLargerThanExplicitlySpecified,
} from "./internal-utils.js";
import { reportDiagnostic } from "./lib.js";
import { getLibraryName } from "./public-utils.js";

/**
 * Create TCGC client types and prepare the cache for clients and operations.
 *
 * @param context TCGCContext
 */
export function prepareClientAndOperationCache(context: TCGCContext): void {
  // initialize the caches
  context.__rawClientsCache = new Map<Namespace | Interface | string, SdkClient>();
  context.__operationToClientCache = new Map<Operation, SdkClient>();
  context.__clientToOperationsCache = new Map<SdkClient, Operation[]>();

  // create clients
  const clients = getOrCreateClients(context);

  // handle versioning with mutated types
  context.__packageVersions = new Map<Namespace, string[]>();
  context.__packageVersionEnum = new Map<Namespace, Enum | undefined>();

  if (clients.length === 1 && clients[0].services.length > 1) {
    // multi-service client
    const versionDependencies = getVersionDependencies(
      context.program,
      clients[0]!.type as Namespace,
    );

    for (const specificService of clients[0].services) {
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

      compilerAssert(
        versionDependency !== undefined && "name" in versionDependency,
        "Client with multiple services is missing version dependency declaration.",
      );

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
    }
  } else if (clients.length > 0) {
    // single-service client
    const versions = getVersions(context.program, clients[0].services[0])[1]?.getVersions();

    if (!versions || versions.length === 0) {
      context.__packageVersions.set(clients[0].services[0], []);
    } else {
      context.__packageVersionEnum.set(clients[0].services[0], versions[0].enumMember.enum);

      removeVersionsLargerThanExplicitlySpecified(context, versions);

      const filteredVersions = versions.map((version) => version.value);
      context.__packageVersions.set(clients[0].services[0], filteredVersions);
    }
  }

  // Track sub client names to detect conflicts in multi-service scenarios
  const subClientNameMap = new Map<string, SdkClient>();
  // Track merged sub clients and their original types for later operations processing
  const mergedSubClientTypes = new Map<SdkClient, (Namespace | Interface)[]>();
  // Track root client types to avoid treating them as sub clients
  const rootClientTypes = new Set<Namespace | Interface>(clients.map((c) => c.type));

  // create sub clients for each client
  for (const client of clients) {
    const subClients: SdkClient[] = [];

    if (client.services.length > 1) {
      // Multiple services case will auto-merge all the services and add their nested sub clients
      for (const specificService of client.services) {
        createFirstLevelSubClients(context, specificService, specificService);
      }
    } else {
      // Single service case needs to use the client type since it could contain customizations
      createFirstLevelSubClients(context, client.type, client.services[0]);
    }

    function createFirstLevelSubClients(
      context: TCGCContext,
      type: Namespace | Interface,
      service: Namespace,
    ) {
      // iterate client's interfaces and namespaces to find sub clients
      if (type.kind === "Namespace") {
        for (const subItem of type.namespaces.values()) {
          const sc = createSubClient(
            context,
            subItem,
            `${client.name}`,
            service,
            client,
            rootClientTypes,
          );
          if (sc && !handleMultipleServicesSubClientNameConflict(sc)) {
            subClients.push(sc);
          }
        }
        for (const subItem of type.interfaces.values()) {
          if (isTemplateDeclaration(subItem)) {
            // Skip template interfaces
            continue;
          }
          const sc = createSubClient(
            context,
            subItem,
            `${client.name}`,
            service,
            client,
            rootClientTypes,
          );
          if (sc && !handleMultipleServicesSubClientNameConflict(sc)) {
            subClients.push(sc);
          }
        }
      }
    }

    function handleMultipleServicesSubClientNameConflict(sc: SdkClient): boolean {
      if (client.services.length > 1 && sc.type) {
        // Track for conflict detection
        const scName = getLibraryName(context, sc.type);
        const existingSc = subClientNameMap.get(scName);
        if (!existingSc) {
          subClientNameMap.set(scName, sc);
        } else {
          // Conflict detected, update the existing sub client to have multiple services
          existingSc.services.push(sc.services[0]);
          existingSc.subClients.push(...sc.subClients);
          if (existingSc.type !== undefined) {
            mergedSubClientTypes.set(existingSc, [existingSc.type as Namespace | Interface]);
            (existingSc as any).type = undefined;
          }
          // Store the merged types for later operations processing
          const types = mergedSubClientTypes.get(existingSc)!;
          if (sc.type) {
            types.push(sc.type);
          }
          return true;
        }
      }
      return false;
    }

    // build client's cache
    context.__rawClientsCache.set(client.type, client);
    client.subClients = subClients;
    context.__clientToOperationsCache.set(client, []);
  }

  // create sub client for `@clientLocation` of string value
  // if no explicit `@client`
  if (!hasExplicitClient(context)) {
    const newSubClientWithServices = new Map<string, Namespace[]>();
    listScopedDecoratorData(context, clientLocationKey).forEach((v, k) => {
      // only deal with mutated types or without mutation
      if (
        (!context.__mutatedRealm && !unsafe_Realm.realmForType.has(k)) ||
        (context.__mutatedRealm && context.__mutatedRealm.hasType(k))
      ) {
        // If the target sub client already exists, handle the multiple services case
        if (typeof v === "string") {
          // Check if a sub client with this name already exists, only check first level for string target
          const existingSc = clients[0].subClients.find(
            (sc) => sc.type && getLibraryName(context, sc.type) === v,
          );

          const operationService =
            clients[0].services.length > 1
              ? findServiceForOperation(clients[0].services, k as Operation)
              : clients[0].services[0];

          if (existingSc) {
            // Sub client already exists - check if moving this operation would create a multi-service situation
            if (!existingSc.services.includes(operationService)) {
              existingSc.services.push(operationService);
            }
            // Operation will be moved to this existing sub client during operations processing
            context.__rawClientsCache!.set(v, existingSc);
            return;
          }

          if (newSubClientWithServices.has(v)) {
            // Add the service to the list if it's not already there
            const services = newSubClientWithServices.get(v)!;
            if (!services.includes(operationService)) {
              services.push(operationService);
            }
          } else {
            newSubClientWithServices.set(v, [operationService]);
          }
        }
      }
    });

    if (newSubClientWithServices.size > 0) {
      newSubClientWithServices.forEach((services, scName) => {
        const sc: SdkClient = {
          kind: "SdkClient",
          name: scName,
          clientPath: `${clients[0].name}.${scName}`,
          services,
          type: undefined as any, // virtual sub client has no backing type
          subClients: [],
          parent: clients[0],
        };
        context.__rawClientsCache!.set(scName, sc);
        clients[0].subClients.push(sc);
        context.__clientToOperationsCache!.set(sc, []);
      });
    }
  }

  // iterate all clients and build a map of operations
  const queue: SdkClient[] = [...clients];
  while (queue.length > 0) {
    const group = queue.shift()!;

    // operations directly under the group
    const operations = [];

    // Check if this is a merged sub client (has multiple services)
    const mergedTypes = mergedSubClientTypes.get(group);

    if (group.parent === undefined && group.services.length > 1 && !mergedTypes) {
      // multi-service root client
      operations.push(...group.services.flatMap((service) => [...service.operations.values()]));
    } else if (mergedTypes) {
      // multi-service sub client
      for (const type of mergedTypes) {
        operations.push(...type.operations.values());
      }
    } else if (group.type) {
      // single-service client or sub client
      operations.push(...group.type.operations.values());
    }

    // when there is explicitly `@client`
    // operations under namespace or interface that are not decorated with `@client`
    // should be placed in the first accessor client or sub client
    if (group.type?.kind === "Namespace" && hasExplicitClient(context)) {
      const innerQueue: Namespace[] = [group.type];
      while (innerQueue.length > 0) {
        const ns = innerQueue.shift()!;
        for (const subNs of ns.namespaces.values()) {
          if (!context.__rawClientsCache.has(subNs)) {
            operations.push(...subNs.operations.values());
            innerQueue.push(subNs);
          }
        }
        for (const iface of ns.interfaces.values()) {
          if (!context.__rawClientsCache.has(iface)) {
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
        let pushGroup: SdkClient = group;
        const clientLocation = getClientLocation(context, op);
        if (clientLocation) {
          // operation with `@clientLocation` decorator is placed in another client
          if (context.__rawClientsCache.has(clientLocation)) {
            pushGroup = context.__rawClientsCache.get(clientLocation)!;
          } else {
            reportDiagnostic(context.program, {
              code: "client-location-wrong-type",
              target: op,
            });
          }
        }
        context.__clientToOperationsCache.get(pushGroup)!.push(op);
        context.__operationToClientCache.set(op, pushGroup);
      }
    }

    if (group.type) queue.push(...group.subClients);
  }

  // omit empty clients
  if (!hasExplicitClient(context)) {
    const removeEmptyClients = (group: SdkClient): boolean => {
      // recursively check and remove empty sub clients
      group.subClients = group.subClients.filter((subClient) => {
        const keep = removeEmptyClients(subClient);
        if (!keep) {
          context.__rawClientsCache!.delete(subClient.type!);
        }
        return keep;
      });

      // check if the group has operations or non-empty sub clients
      const hasOperations = context.__clientToOperationsCache!.get(group)!.length > 0;
      const hasSubClients = group.subClients.length > 0;

      return hasOperations || hasSubClients;
    };

    // start from the top-level clients and remove empty groups
    for (const client of clients) {
      const keepClient = removeEmptyClients(client);
      if (!keepClient) {
        context.__rawClientsCache.delete(client.type);
        context.__clientToOperationsCache.delete(client);
      }
    }
  }
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

  const explicitClients = [];
  for (const ns of namespaces) {
    if (getScopedDecoratorData(context, clientKey, ns)) {
      explicitClients.push(getScopedDecoratorData(context, clientKey, ns));
    }
    for (const i of ns.interfaces.values()) {
      if (getScopedDecoratorData(context, clientKey, i)) {
        explicitClients.push(getScopedDecoratorData(context, clientKey, i));
      }
    }
  }
  if (explicitClients.length > 0) {
    if (explicitClients.some((client) => isArm(client.services))) {
      context.arm = true;
    }
    // Filter out clients whose type is nested inside another client's type.
    // Those are sub clients, not root clients.
    const allClientTypes = new Set<Namespace | Interface>(
      explicitClients.map((c: SdkClient) => c.type),
    );
    return explicitClients.filter((client: SdkClient) => {
      let container: Namespace | undefined =
        client.type.kind === "Interface" ? client.type.namespace : client.type.namespace;
      while (container) {
        if (allClientTypes.has(container)) return false;
        container = container.namespace;
      }
      return true;
    });
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
        services: [service],
        type: service,
        subClients: [],
        clientPath: clientName,
      },
    ];
  }

  return [];
}

/**
 * Create a TCGC sub client for the given type.
 * This function will also iterate through the type's namespaces and interfaces to build nested sub clients.
 *
 * @param context TCGCContext
 * @param type
 * @returns
 */
function createSubClient(
  context: TCGCContext,
  type: Namespace | Interface,
  clientPathPrefix: string,
  service: Namespace,
  parent?: SdkClient,
  rootClientTypes?: Set<Namespace | Interface>,
): SdkClient | undefined {
  let subClient: SdkClient | undefined;
  const clientName = getLibraryName(context, type);
  const clientPath = `${clientPathPrefix}.${clientName}`;

  if (hasExplicitClient(context)) {
    // Check for @client on nested types
    // Skip types that are root clients (declared with @client at the top level)
    const clientData = getScopedDecoratorData(context, clientKey, type);

    if (clientData && !rootClientTypes?.has(type)) {
      subClient = {
        kind: "SdkClient",
        name: clientName,
        type,
        clientPath,
        services: [service],
        subClients: [],
        parent,
      } as SdkClient;

      if (type.kind === "Namespace") {
        subClient.subClients =
          buildHierarchyOfSubClients(
            context,
            type,
            clientPath,
            service,
            subClient,
            rootClientTypes,
          ) ?? [];
      }
    }
  } else {
    // if there is no explicit client, we will treat non-client namespaces and all interfaces as sub clients
    if (type.kind !== "Interface" || !isTemplateDeclaration(type)) {
      subClient = {
        kind: "SdkClient",
        name: clientName,
        type,
        clientPath,
        services: [service],
        subClients: [],
        parent,
      };
    }

    if (subClient && type.kind === "Namespace") {
      subClient.subClients =
        buildHierarchyOfSubClients(context, type, clientPath, service, subClient) ?? [];
    }
  }

  // build sub client's cache
  if (subClient) {
    context.__rawClientsCache!.set(subClient.type!, subClient);
    context.__clientToOperationsCache!.set(subClient, []);
  }

  return subClient;
}

function buildHierarchyOfSubClients(
  context: TCGCContext,
  type: Namespace,
  clientPathPrefix: string,
  service: Namespace,
  parent?: SdkClient,
  rootClientTypes?: Set<Namespace | Interface>,
): SdkClient[] | undefined {
  // build hierarchy of sub clients
  const subClients: SdkClient[] = [];
  type.namespaces.forEach((ns) => {
    const subClient = createSubClient(
      context,
      ns,
      clientPathPrefix,
      service,
      parent,
      rootClientTypes,
    );
    if (subClient) {
      subClients.push(subClient);
    }
  });
  type.interfaces.forEach((i) => {
    const subClient = createSubClient(
      context,
      i,
      clientPathPrefix,
      service,
      parent,
      rootClientTypes,
    );
    if (subClient) {
      subClients.push(subClient);
    }
  });
  if (subClients.length > 0) {
    return subClients;
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
