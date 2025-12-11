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
import { getVersionDependencies, getVersions } from "@typespec/versioning";
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

  // handle versioning with mutated types
  context.__packageVersions = new Map<Namespace, string[]>();
  context.__packageVersionEnum = new Map<Namespace, Enum | undefined>();

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
      // Multiple services case will auto-merge all the services and add their nested operation groups
      for (const specificService of client.service) {
        createFirstLevelOperationGroup(context, specificService, specificService);
      }
    } else {
      // Single service case needs to use the client type since it could contain customizations
      createFirstLevelOperationGroup(context, client.type, client.service);
    }

    function createFirstLevelOperationGroup(
      context: TCGCContext,
      type: Namespace | Interface,
      service: Namespace,
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
  if (!hasExplicitClientOrOperationGroup(context)) {
    const newOperationGroupWithService = new Map<string, Namespace>();
    listScopedDecoratorData(context, clientLocationKey).forEach((v, k) => {
      // only deal with mutated types or without mutation
      if (!context.__mutatedRealm || context.__mutatedRealm.hasType(k)) {
        if (typeof v === "string") {
          if (
            clients[0].subOperationGroups.some(
              (og) => og.type && getLibraryName(context, og.type) === v,
            )
          ) {
            // do not create a new operation group if it already exists
            return;
          }
          if (newOperationGroupWithService.has(v)) {
            if (
              newOperationGroupWithService.has(v) &&
              Array.isArray(clients[0].service) &&
              findService(clients[0].service, k as Operation) !==
                newOperationGroupWithService.get(v)
            ) {
              // multiple services case: need to ensure operations with same client location are from the same service
              reportDiagnostic(context.program, {
                code: "client-location-new-operation-group-multi-service",
                target: k,
              });
            }
            return;
          }

          newOperationGroupWithService.set(
            v,
            Array.isArray(clients[0].service)
              ? findService(clients[0].service, k as Operation)
              : clients[0].service,
          );
        }
      }
    });

    if (newOperationGroupWithService.size > 0) {
      newOperationGroupWithService.forEach((service, ogName) => {
        const og: SdkOperationGroup = {
          kind: "SdkOperationGroup",
          groupPath: `${clients[0].name}.${ogName}`,
          service: service,
          subOperationGroups: [],
          parent: clients[0],
        };
        context.__rawClientsOperationGroupsCache!.set(ogName, og);
        clients[0].subOperationGroups!.push(og);
        context.__clientToOperationsCache!.set(og, []);
      });
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
 * Find the service namespace that contains the given operation.
 * @param services
 * @param operation
 * @returns
 */
function findService(services: Namespace[], operation: Operation): Namespace {
  let namespace = operation.namespace;
  while (namespace) {
    if (services.includes(namespace)) {
      return namespace;
    }
    namespace = namespace.namespace;
  }
  // fallback to the first service
  return services[0];
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
  service: Namespace,
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
  service: Namespace,
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
