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
import { SdkClient, SdkOperationGroup, TCGCContext } from "./interfaces.js";
import {
  clientKey,
  clientLocationKey,
  findServiceForOperation,
  getScopedDecoratorData,
  hasExplicitClientOrOperationGroup,
  listAllUserDefinedNamespaces,
  listScopedDecoratorData,
  omitOperation,
  removeVersionsLargerThanExplicitlySpecified,
} from "./internal-utils.js";
import { reportDiagnostic } from "./lib.js";
import { getLibraryName } from "./public-utils.js";

/**
 * Check if a multi-service client has nested @client decorators within its namespace.
 * When nested @client decorators exist, the explicit hierarchy should be used instead of auto-merging.
 */
function hasNestedClientDecorators(context: TCGCContext, client: SdkClient): boolean {
  if (client.type.kind !== "Namespace") return false;
  // Check if any @client decorated namespaces or interfaces exist within this client's namespace
  const clientNs = client.type;
  for (const subNs of clientNs.namespaces.values()) {
    if (getScopedDecoratorData(context, clientKey, subNs)) {
      return true;
    }
  }
  for (const iface of clientNs.interfaces.values()) {
    if (getScopedDecoratorData(context, clientKey, iface)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a namespace is empty (no user-defined operations, namespaces, or interfaces).
 * Used to determine if a client namespace should auto-merge from its service.
 */
function isNamespaceEmpty(ns: Namespace): boolean {
  return ns.operations.size === 0 && ns.namespaces.size === 0 && ns.interfaces.size === 0;
}

/**
 * Check if a service namespace has explicit nested client customization decorators
 * on any of its interfaces or namespaces.
 */
function serviceHasOperationGroupDecorators(context: TCGCContext, service: Namespace): boolean {
  for (const [type] of context.program.stateMap(clientKey).entries()) {
    if (type.kind === "Interface" || type.kind === "Namespace") {
      // Check if this type is within the service namespace
      let ns: Namespace | undefined = type.namespace;
      while (ns) {
        if (ns === service) return true;
        ns = ns.namespace;
      }
    }
  }
  return false;
}

/**
 * Create TCGC client types and prepare the cache for clients, sub-clients and operations.
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

  for (const client of clients) {
    if (client.services.length > 1) {
      // multi-service client
      const versionDependencies = getVersionDependencies(context.program, client.type as Namespace);

      for (const specificService of client.services) {
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
    } else if (client.services.length === 1) {
      const service = client.services[0];
      if (context.__packageVersions.has(service)) {
        continue;
      }
      // single-service client
      const versions = getVersions(context.program, service)[1]?.getVersions();

      if (!versions || versions.length === 0) {
        context.__packageVersions.set(service, []);
      } else {
        context.__packageVersionEnum.set(service, versions[0].enumMember.enum);

        removeVersionsLargerThanExplicitlySpecified(context, versions);

        const filteredVersions = versions.map((version) => version.value);
        context.__packageVersions.set(service, filteredVersions);
      }
    }
  }

  // Track sub-client names to detect conflicts when auto-mergeing services
  const subClientNameMap = new Map<string, SdkClient>();
  // Track merged sub-clients and their original types for later operations processing
  const mergedSubClientsTypes = new Map<SdkClient, (Namespace | Interface)[]>();

  // create operation groups for each client
  for (const client of clients) {
    const groups: SdkClient[] = [];

    // Track if this client is auto-merging (operation groups should be auto-created from service)
    let isAutoMerging = false;

    if (client.services.length > 1 && !hasNestedClientDecorators(context, client)) {
      // Multiple services case will auto-merge all the services and add their nested operation groups
      // Only auto-merge when the client namespace is "empty" (no nested @client decorators)
      isAutoMerging = true;
      for (const specificService of client.services) {
        createFirstLevelSubClient(context, specificService, specificService);
      }
    } else if (client.services.length <= 1) {
      // Single service case
      // If the client type is NOT the service itself and the client namespace is empty,
      // auto-merge from the service namespace (Scenario 1: explicit client with empty namespace)
      // But only if the service content doesn't have @operationGroup decorators in any scope
      const clientType = client.type;
      const service = client.services[0];
      if (
        clientType !== service &&
        clientType.kind === "Namespace" &&
        isNamespaceEmpty(clientType) &&
        !serviceHasOperationGroupDecorators(context, service)
      ) {
        isAutoMerging = true;
        createFirstLevelSubClient(context, service, service);
      } else {
        createFirstLevelSubClient(context, clientType, service);
      }
    } else if (client.services.length > 1 && hasNestedClientDecorators(context, client)) {
      // Multi-service client with nested @client decorators (Scenario 2/3)
      // Create operation groups for each nested @client
      if (client.type.kind === "Namespace") {
        for (const subNs of client.type.namespaces.values()) {
          const nestedClientData = getScopedDecoratorData(context, clientKey, subNs) as
            | SdkClient
            | undefined;
          if (nestedClientData) {
            // Create an sub-client for the nested client
            const subClient: SdkClient = {
              kind: "SdkClient",
              type: subNs,
              name: nestedClientData.name,
              clientPath: `${client.name}.${nestedClientData.name}`,
              service: nestedClientData.services[0],
              services: nestedClientData.services,
              subOperationGroups: [],
              children: [],
              parent: client,
            };
            context.__rawClientsCache!.set(subNs, subClient);
            context.__clientToOperationsCache!.set(subClient, []);

            // If the nested client namespace is empty, auto-merge from its service
            if (isNamespaceEmpty(subNs)) {
              for (const nestedService of nestedClientData.services) {
                if (nestedService.kind === "Namespace") {
                  addServiceContentToNestedOperationGroup(subClient, nestedService);
                }
              }
            }
            groups.push(subClient);
          }
        }
        for (const iface of client.type.interfaces.values()) {
          const nestedClientData = getScopedDecoratorData(context, clientKey, iface) as
            | SdkClient
            | undefined;
          if (nestedClientData) {
            const subClient: SdkClient = {
              kind: "SdkClient",
              type: iface,
              name: nestedClientData.name,
              clientPath: `${client.name}.${nestedClientData.name}`,
              service: nestedClientData.services[0],
              services: nestedClientData.services,
              children: [],
              subOperationGroups: [],
              parent: client,
            };
            context.__rawClientsCache!.set(iface, subClient);
            context.__clientToOperationsCache!.set(subClient, []);
            groups.push(subClient);
          }
        }
      }
    }

    function addOrMergeSubClient(targetClient: SdkClient, subClient: SdkClient) {
      const subGroupName = subClient.type
        ? getLibraryName(context, subClient.type)
        : subClient.clientPath;
      const existing = targetClient.children.find((x) => {
        const name = x.type ? getLibraryName(context, x.type) : x.clientPath;
        return name === subGroupName;
      });
      if (!existing) {
        targetClient.children.push(subClient);
        return;
      }
      for (const svc of subClient.services) {
        if (!existing.services.includes(svc)) {
          existing.services.push(svc);
        }
      }
      existing.service = existing.services[0]; // eslint-disable-line @typescript-eslint/no-deprecated
      if (
        existing.type !== undefined &&
        subClient.type !== undefined &&
        existing.type !== subClient.type
      ) {
        const existingMergedTypes = mergedSubClientsTypes.get(existing) ?? [existing.type];
        existingMergedTypes.push(subClient.type);
        mergedSubClientsTypes.set(existing, existingMergedTypes);
        existing.type = undefined;
      }
      for (const nestedSubClient of subClient.children) {
        addOrMergeSubClient(existing, nestedSubClient);
      }
    }

    function addServiceContentToNestedOperationGroup(
      targetClient: SdkClient,
      serviceNamespace: Namespace,
    ): void {
      for (const serviceSubNs of serviceNamespace.namespaces.values()) {
        const subClient = createSubClients(
          context,
          serviceSubNs,
          targetClient.clientPath,
          serviceNamespace,
          targetClient,
          true,
        );
        if (subClient) {
          addOrMergeSubClient(targetClient, subClient);
        }
      }
      for (const serviceIface of serviceNamespace.interfaces.values()) {
        if (isTemplateDeclaration(serviceIface)) continue;
        const subClient = createSubClients(
          context,
          serviceIface,
          targetClient.clientPath,
          serviceNamespace,
          targetClient,
          true,
        );
        if (subClient) {
          addOrMergeSubClient(targetClient, subClient);
        }
      }
    }

    function createFirstLevelSubClient(
      context: TCGCContext,
      type: Namespace | Interface,
      service: Namespace,
    ) {
      // iterate client's interfaces and namespaces to find operation groups
      if (type.kind === "Namespace") {
        for (const subItem of type.namespaces.values()) {
          const subClient = createSubClients(
            context,
            subItem,
            `${client.name}`,
            service,
            client,
            isAutoMerging,
          );
          if (subClient && !handleMultipleServicesSubClientNameConflict(subClient)) {
            groups.push(subClient);
          }
        }
        for (const subItem of type.interfaces.values()) {
          if (isTemplateDeclaration(subItem)) {
            // Skip template interfaces
            continue;
          }
          const og = createSubClients(
            context,
            subItem,
            `${client.name}`,
            service,
            client,
            isAutoMerging,
          );
          if (og && !handleMultipleServicesSubClientNameConflict(og)) {
            groups.push(og);
          }
        }
      }
    }

    function handleMultipleServicesSubClientNameConflict(subClient: SdkClient): boolean {
      if (client.services.length > 1 && subClient.type) {
        // Track for conflict detection
        const ogName = getLibraryName(context, subClient.type);
        const existingSubClient = subClientNameMap.get(ogName);
        if (!existingSubClient) {
          subClientNameMap.set(ogName, subClient);
        } else {
          // Conflict detected, update the existing operation group to have multiple services
          existingSubClient.services.push(subClient.services[0]);
          existingSubClient.service = existingSubClient.services[0]; // eslint-disable-line @typescript-eslint/no-deprecated
          existingSubClient.children.push(...subClient.children);
          if (existingSubClient.type !== undefined) {
            mergedSubClientsTypes.set(existingSubClient, [existingSubClient.type!]);
            existingSubClient.type = undefined;
          }
          // Store the merged types for later operations processing
          const types = mergedSubClientsTypes.get(existingSubClient)!;
          if (subClient.type) {
            types.push(subClient.type);
          }
          return true;
        }
      }
      return false;
    }

    // build client's cache
    context.__rawClientsCache.set(client.type, client);
    client.children = groups;
    context.__clientToOperationsCache.set(client, []);
  }

  // create operation group for `@clientLocation` of  string value
  const newSubClientWithServices = new Map<string, Namespace[]>();
  listScopedDecoratorData(context, clientLocationKey).forEach((v, k) => {
    // only deal with mutated types or without mutation
    if (
      (!context.__mutatedRealm && !unsafe_Realm.realmForType.has(k)) ||
      (context.__mutatedRealm && context.__mutatedRealm.hasType(k))
    ) {
      // If the target operation group already exists, handle the multiple services case
      if (typeof v === "string") {
        // Check if an operation group with this name already exists, only check first level og for string target
        const existingOg = clients[0].children.find(
          (og) => og.type && getLibraryName(context, og.type) === v,
        );

        const operationService =
          clients[0].services.length > 1
            ? findServiceForOperation(clients[0].services, k as Operation)
            : clients[0].services[0];

        if (existingOg) {
          // Operation group already exists - check if moving this operation would create a multi-service situation
          // Check if the existing operation group's service matches the operation's service
          if (!existingOg.services.includes(operationService)) {
            // This would create a multi-service operation group - merge the services
            existingOg.services.push(operationService);
            existingOg.service = existingOg.services[0]; // eslint-disable-line @typescript-eslint/no-deprecated
          }
          // Operation will be moved to this existing operation group during operations processing
          context.__rawClientsCache!.set(v, existingOg);
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
    newSubClientWithServices.forEach((services, ogName) => {
      const subClient: SdkClient = {
        kind: "SdkClient",
        name: ogName,
        clientPath: `${clients[0].name}.${ogName}`,
        service: services[0],
        services,
        children: [],
        subOperationGroups: [],
        parent: clients[0],
      };
      context.__rawClientsCache!.set(ogName, subClient);
      clients[0].children!.push(subClient);
      context.__clientToOperationsCache!.set(subClient, []);
    });
  }

  // iterate all clients and operation groups and build a map of operations
  const queue: SdkClient[] = [...clients];
  while (queue.length > 0) {
    const subClient = queue.shift()!;

    // operations directly under the group
    const operations = [];

    // Check if this is a merged operation group (has multiple services but still has a type)
    const mergedTypes =
      subClient.kind === "SdkOperationGroup" ? mergedSubClientsTypes.get(subClient) : undefined;

    if (subClient.kind === "SdkClient" && subClient.services.length > 1) {
      // multi-service client - collect operations from all services
      operations.push(...subClient.services.flatMap((service) => [...service.operations.values()]));
    } else if (mergedTypes) {
      // multi-service operation group
      for (const type of mergedTypes) {
        operations.push(...type.operations.values());
      }
    } else if (subClient.type) {
      // single-service client or operation group
      operations.push(...subClient.type.operations.values());
      // If this is a single-service client with an empty namespace (different from service),
      // also collect operations from the service namespace
      if (
        subClient.kind === "SdkClient" &&
        subClient.services.length === 1 &&
        subClient.type !== subClient.services[0] &&
        subClient.type.kind === "Namespace" &&
        isNamespaceEmpty(subClient.type)
      ) {
        operations.push(...subClient.services[0].operations.values());
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
        let pushSubClient: SdkClient = subClient;
        const clientLocation = getClientLocation(context, op);
        if (clientLocation) {
          // operation with `@clientLocation` decorator is placed in another operation group
          if (context.__rawClientsCache.has(clientLocation)) {
            pushSubClient = context.__rawClientsCache.get(clientLocation)!;
          } else {
            reportDiagnostic(context.program, {
              code: "client-location-wrong-type",
              target: op,
            });
          }
        }
        context.__clientToOperationsCache.get(pushSubClient)!.push(op);
        context.__operationToClientCache.set(op, pushSubClient);
      }
    }

    if (subClient.type) queue.push(...subClient.subOperationGroups);
  }

  // omit empty client or operation groups
  const removeEmptyGroups = (group: SdkOperationGroup | SdkClient): boolean => {
    // recursively check and remove empty sub-operation groups
    group.subOperationGroups = group.subOperationGroups.filter((subGroup) => {
      const keep = removeEmptyGroups(subGroup);
      if (!keep) {
        context.__rawClientsCache!.delete(subGroup.type!);
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
      context.__rawClientsCache.delete(client.type);
      context.__clientToOperationsCache.delete(client);
    }
  }
}

/**
 * Get or create the TCGC clients.
 * If user has explicitly defined `@client` then we will use those clients.
 * If user has not defined any `@client` then we will create a client for all services' namespace.
 *
 * @param context TCGCContext
 * @returns
 */
function getOrCreateClients(context: TCGCContext): SdkClient[] {
  const namespaces: Namespace[] = listAllUserDefinedNamespaces(context);

  const explicitClients: SdkClient[] = [];
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
    let ignoreExplicitClient = false;

    // Build explicit client hierarchy based on namespace containment.
    // Walk up the entire ancestor namespace chain to find the nearest parent client,
    // since there may be redundant intermediate namespaces without @client decorators.
    for (const client of explicitClients) {
      let ns = client.type.namespace;
      while (ns) {
        const parentClient = explicitClients.find((other) => other !== client && other.type === ns);
        if (parentClient) {
          client.parent = parentClient;
          parentClient.children.push(client);
          break;
        }
        ns = ns.namespace;
      }
    }

    const rootClients = explicitClients.filter((client) => client.parent === undefined);

    // Validate and resolve services level-by-level (BFS from root to inner).
    // This ensures parent services are resolved before children try to inherit or validate against them.
    const queue: SdkClient[] = [...rootClients];
    while (queue.length > 0) {
      const client = queue.shift()!;

      if (!client.parent) {
        // Root (first-layer) client validations
        // ARM flag set
        if (!context.arm && isArm(client.services)) {
          context.arm = true;
        }

        // Root client must have services defined
        if (client.services.length === 0) {
          reportDiagnostic(context.program, {
            code: "client-service",
            format: { name: client.name },
            target: client.type,
          });
          ignoreExplicitClient = true;
          continue;
        }

        if (client.services.length > 1) {
          // Multiple services on interface is not allowed for root clients
          if (client.type.kind === "Interface") {
            reportDiagnostic(context.program, {
              code: "invalid-client-service-multiple",
              target: client.type,
            });
            continue;
          }
        }
      } else {
        // Nested (sub) client validations
        if (client.services.length === 0) {
          // No service specified - inherit from parent
          client.services = [...client.parent.services];
          client.service = client.parent.service; // eslint-disable-line @typescript-eslint/no-deprecated
        } else {
          // Validate services are a subset of parent's services
          let valid = true;
          for (const svc of client.services) {
            if (!client.parent.services.includes(svc)) {
              reportDiagnostic(context.program, {
                code: "nested-client-service-not-subset",
                target: client.type,
              });
              valid = false;
              break;
            }
          }
          if (!valid) {
            ignoreExplicitClient = true;
          }
        }
      }

      // Enqueue children so they are processed after this client's services are resolved
      queue.push(...client.children);
    }

    if (rootClients.length > 0 && !ignoreExplicitClient) {
      // Only return root level clients, sub clients will be accessed through the parent client's `subClients` property
      return rootClients;
    }
  }

  // if there is no explicit client, we will create a separate root client for each service namespace
  const serviceNamespaces: Namespace[] = namespaces.filter((ns) => isService(context.program, ns));
  if (serviceNamespaces.length >= 1) {
    const clients: SdkClient[] = [];
    for (const service of serviceNamespaces) {
      let originalName = service.name;
      const clientNameOverride = getClientNameOverride(context, service);
      if (clientNameOverride) {
        originalName = clientNameOverride;
      } else {
        originalName = service.name;
      }
      const clientName = originalName.endsWith("Client") ? originalName : `${originalName}Client`;
      clients.push({
        kind: "SdkClient",
        name: clientName,
        service: service,
        services: [service],
        type: service,
        subOperationGroups: [],
        children: [],
      });
    }
    context.arm = clients.some((client) => isArm(client.services));
    return clients;
  }

  return [];
}

/**
 * Create a TCGC sub-client for the given type.
 * This function will also iterate through the type's namespaces and interfaces to build nested sub-clients.
 *
 * @param context TCGCContext
 * @param type
 * @returns
 */
function createSubClients(
  context: TCGCContext,
  type: Namespace | Interface,
  groupPathPrefix: string,
  service: Namespace,
  parent?: SdkClient,
): SdkClient | undefined {
  let subClient: SdkClient | undefined;
  if (!forceImplicit && hasExplicitClientOrOperationGroup(context)) {
    // Check consolidated @client state.
    const nestedClient = getScopedDecoratorData(context, clientKey, type) as SdkClient | undefined;
    if (nestedClient) {
      subClient = {
        kind: "SdkClient",
        type: type,
      } as SdkClient;
    }
    if (subClient) {
      subClient.clientPath = `${groupPathPrefix}.${getLibraryName(context, type)}`;

      subClient.service = service; // eslint-disable-line @typescript-eslint/no-deprecated
      subClient.services = [service];
      subClient.subOperationGroups = [];
      subClient.parent = parent;

      if (type.kind === "Namespace") {
        subClient.children =
          buildHierarchyOfSubClients(context, type, subClient.clientPath, service, subClient) ?? [];
      }
    }
  } else {
    // if there is no explicit client, we will treat non-client namespaces and all interfaces as operation group
    if (type.kind !== "Interface" || !isTemplateDeclaration(type)) {
      subClient = {
        kind: "SdkClient",
        type,
        clientPath: `${groupPathPrefix}.${getLibraryName(context, type)}`,
        service: service,
        services: [service],
        children: [],
        parent,
      };
    }

    if (subClient && type.kind === "Namespace") {
      subClient.children =
        buildHierarchyOfSubClients(context, type, subClient.clientPath, service, subClient) ?? [];
    }
  }

  // build operation group's cache
  if (subClient) {
    context.__rawClientsCache!.set(subClient.type!, subClient);
    context.__clientToOperationsCache!.set(subClient, []);
  }

  return subClient;
}

function buildHierarchyOfSubClients(
  context: TCGCContext,
  type: Namespace,
  groupPathPrefix: string,
  service: Namespace,
  parent?: SdkClient,
): SdkClient[] | undefined {
  // build hierarchy of sub-clients
  const subClients: SdkClient[] = [];
  type.namespaces.forEach((ns) => {
    const subClient = createSubClients(context, ns, groupPathPrefix, service, parent);
    if (subClient) {
      subClients.push(subClient);
    }
  });
  type.interfaces.forEach((i) => {
    const subClient = createSubClients(context, i, groupPathPrefix, service, parent);
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
