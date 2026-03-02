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

  // get root clients with full hierarchy (root clients + sub clients)
  const { clients, mergedSubClientTypes } = getRootClients(context);

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

  // iterate all clients and build a map of operations
  const queue: SdkClient[] = [...clients];
  while (queue.length > 0) {
    const client = queue.shift()!;

    // operations directly under the group
    const operations = [];

    // Check if this is a merged sub client (has multiple services)
    const mergedTypes = mergedSubClientTypes.get(client);

    if (client.parent === undefined && client.services.length > 1 && !mergedTypes) {
      // multi-service root client
      operations.push(...client.services.flatMap((service) => [...service.operations.values()]));
    } else if (mergedTypes) {
      // multi-service sub client
      for (const type of mergedTypes) {
        operations.push(...type.operations.values());
      }
    } else if (client.type) {
      // single-service client or sub client
      operations.push(...client.type.operations.values());
    }

    // when there is explicitly `@client`
    // operations under namespace or interface that are not decorated with `@client`
    // should be placed in the first accessor client or sub client
    if (client.type?.kind === "Namespace" && hasExplicitClient(context)) {
      const innerQueue: Namespace[] = [client.type];
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
        let pushGroup: SdkClient = client;
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

    queue.push(...client.subClients);
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

interface ClientCreationResult {
  clients: SdkClient[];
  mergedSubClientTypes: Map<SdkClient, (Namespace | Interface)[]>;
}

/**
 * Get the TCGC root clients with full hierarchy.
 * If user has explicitly defined `@client` then we will use those clients.
 * If user has not defined any `@client` then we will create a client for the first service namespace.
 * This function also creates sub clients, handles multi-service merging,
 * and creates virtual sub clients for `@clientLocation` string values.
 *
 * @param context TCGCContext
 * @returns
 */
function getRootClients(context: TCGCContext): ClientCreationResult {
  const mergedSubClientTypes = new Map<SdkClient, (Namespace | Interface)[]>();
  const namespaces: Namespace[] = listAllUserDefinedNamespaces(context);

  // Collect all explicit @client declarations
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

  let clients: SdkClient[];

  if (explicitClients.length > 0) {
    // ── Explicit @client path ──

    // Build client hierarchy
    if (explicitClients.some((client) => isArm(client.services))) {
      context.arm = true;
    }

    // Explicit client cache
    explicitClients.map((c) => {
      context.__rawClientsCache!.set(c.type, c);
      context.__clientToOperationsCache!.set(c, []);
    });

    // Build explicit client hierarchy
    explicitClients.map((client: SdkClient) => {
      let parentClientType: Namespace | undefined = client.type.namespace;
      while (parentClientType) {
        const parentClient = context.__rawClientsCache?.get(parentClientType);
        if (parentClient) {
          client.parent = parentClient;
          client.clientPath = `${client.parent.name}.${client.clientPath}`;
          parentClient.subClients.push(client);
          break;
        }
        parentClientType = parentClientType.namespace;
      }
    });

    // Get root clients
    clients = explicitClients.filter((c: SdkClient) => c.parent === undefined);

    // Set service for sub client if not exist
    const setServiceForSubClients = (parentClient: SdkClient) => {
      for (const subClient of parentClient.subClients) {
        if (subClient.services.length === 0) {
          subClient.services = [...parentClient.services];
        }
        setServiceForSubClients(subClient);
      }
    };
    for (const client of clients) {
      setServiceForSubClients(client);
    }

    // Add sub-client hierarchy if multiple service

    const subClientNameMap = new Map<string, SdkClient>();
    clients.map((client: SdkClient) => {
      if (client.services.length > 1) {
        // Explicit multi-service: follow services to build hierarchy
        const subClients: SdkClient[] = [];
        for (const specificService of client.services) {
          for (const sc of buildSubClientHierarchy(
            context,
            specificService,
            client.name,
            specificService,
            client,
          )) {
            if (
              !handleMultipleServicesSubClientNameConflict(
                context,
                sc,
                client,
                subClientNameMap,
                mergedSubClientTypes,
              )
            ) {
              subClients.push(sc);
            }
          }
        }
        context.__rawClientsCache!.set(client.type, client);
        client.subClients = subClients;
        context.__clientToOperationsCache!.set(client, []);
      }
    });
  } else {
    // ── No explicit @client path ──
    // Create root client from first service namespace and build hierarchy by following services

    const serviceNamespaces: Namespace[] = namespaces.filter((ns) =>
      isService(context.program, ns),
    );
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
      clients = [
        {
          kind: "SdkClient",
          name: clientName,
          services: [service],
          type: service,
          subClients: [],
          clientPath: clientName,
        },
      ];
      clients[0].subClients = buildSubClientHierarchy(
        context,
        clients[0].services[0],
        clients[0].name,
        clients[0].services[0],
        clients[0],
      );
      context.__rawClientsCache!.set(clients[0].type, clients[0]);
      context.__clientToOperationsCache!.set(clients[0], []);
    } else {
      clients = [];
    }

    if (clients.length === 0) {
      return { clients, mergedSubClientTypes };
    }
  }

  // Create virtual sub clients for `@clientLocation` of string value
  // This applies to both explicit and non-explicit client paths
  createVirtualSubClientsFromClientLocation(context, clients);

  return { clients, mergedSubClientTypes };
}

/**
 * Create virtual sub clients for `@clientLocation` decorator with string target values.
 * This handles cases where operations are moved to a named sub-client that may not exist yet.
 */
function createVirtualSubClientsFromClientLocation(
  context: TCGCContext,
  clients: SdkClient[],
): void {
  if (clients.length === 0) return;

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

function handleMultipleServicesSubClientNameConflict(
  context: TCGCContext,
  sc: SdkClient,
  client: SdkClient,
  subClientNameMap: Map<string, SdkClient>,
  mergedSubClientTypes: Map<SdkClient, (Namespace | Interface)[]>,
): boolean {
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

/**
 * Build a sub-client hierarchy by iterating child namespaces and interfaces of the given type.
 * Recursively creates sub-clients for all child namespaces and non-template interfaces,
 * returning the direct children as a list.
 *
 * @param context TCGCContext
 * @param type The parent namespace or interface whose children become sub-clients
 * @param clientPathPrefix The parent's client path prefix
 * @param service The service namespace
 * @param parent The parent client
 * @returns The list of direct child sub-clients
 */
function buildSubClientHierarchy(
  context: TCGCContext,
  type: Namespace | Interface,
  clientPathPrefix: string,
  service: Namespace,
  parent?: SdkClient,
): SdkClient[] {
  if (type.kind !== "Namespace") return [];

  const subClients: SdkClient[] = [];

  for (const ns of type.namespaces.values()) {
    const sc = createSubClient(context, ns, clientPathPrefix, service, parent);
    if (sc) subClients.push(sc);
  }
  for (const iface of type.interfaces.values()) {
    const sc = createSubClient(context, iface, clientPathPrefix, service, parent);
    if (sc) subClients.push(sc);
  }

  return subClients;
}

/**
 * Create a single sub-client for the given type and recursively build its children.
 */
function createSubClient(
  context: TCGCContext,
  type: Namespace | Interface,
  clientPathPrefix: string,
  service: Namespace,
  parent?: SdkClient,
): SdkClient | undefined {
  // Skip template interfaces
  if (type.kind === "Interface" && isTemplateDeclaration(type)) {
    return undefined;
  }

  const clientName = getLibraryName(context, type);
  const clientPath = `${clientPathPrefix}.${clientName}`;

  const subClient: SdkClient = {
    kind: "SdkClient",
    name: clientName,
    type,
    clientPath,
    services: [service],
    subClients: [],
    parent,
  };

  // Recursively build children for namespaces
  if (type.kind === "Namespace") {
    subClient.subClients = buildSubClientHierarchy(context, type, clientPath, service, subClient);
  }

  // Cache
  context.__rawClientsCache!.set(subClient.type!, subClient);
  context.__clientToOperationsCache!.set(subClient, []);

  return subClient;
}

function isArm(service: Namespace[] | Namespace): boolean {
  if (Array.isArray(service)) {
    return service.some((s) => isArm(s));
  }
  return service.decorators.some(
    (decorator) => decorator.decorator.name === "$armProviderNamespace",
  );
}
