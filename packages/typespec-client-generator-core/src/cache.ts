import {
  getNamespaceFullName,
  Interface,
  isService,
  isTemplateDeclaration,
  isTemplateDeclarationOrInstance,
  Namespace,
  Operation,
  Program,
} from "@typespec/compiler";
import { getClientNameOverride, getMoveTo, isInScope } from "./decorators.js";
import { LanguageScopes, SdkClient, SdkOperationGroup, TCGCContext } from "./interfaces.js";
import {
  AllScopes,
  clientKey,
  getScopedDecoratorData,
  hasExplicitClientOrOperationGroup,
  listAllUserDefinedNamespaces,
  listScopedDecoratorData,
  moveToKey,
  omitOperation,
  operationGroupKey,
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

  // create operation groups for each client
  for (const client of clients) {
    const groups: SdkOperationGroup[] = [];

    // iterate client's interfaces and namespaces to find operation groups
    if (client.type.kind === "Namespace") {
      for (const subItem of client.type.namespaces.values()) {
        const og = createOperationGroup(context, subItem, `${client.name}`);
        if (og) {
          groups.push(og);
        }
      }
      for (const subItem of client.type.interfaces.values()) {
        if (isTemplateDeclaration(subItem)) {
          // Skip template interfaces
          continue;
        }
        const og = createOperationGroup(context, subItem, `${client.name}`);
        if (og) {
          groups.push(og);
        }
      }
    }

    // build client's cache
    context.__rawClientsOperationGroupsCache.set(client.type, client);
    client.subOperationGroups = groups;
    context.__clientToOperationsCache.set(client, []);
  }

  // create operation group for `@moveTo` a new operation group
  // if no explicit `@client` or `@operationGroup`
  if (!hasExplicitClientOrOperationGroup(context)) {
    const newOperationGroupNames = new Set<string>();
    listScopedDecoratorData(context, moveToKey).map((target) => {
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
      // add operations
      for (const op of group.type.operations.values()) {
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
          const moveTo = getMoveTo(context, op);
          if (moveTo) {
            // operation with `@moveTo` decorator will be moved to another operation group
            if (context.__rawClientsOperationGroupsCache.has(moveTo)) {
              pushGroup = context.__rawClientsOperationGroupsCache.get(moveTo)!;
            } else {
              if (typeof moveTo !== "string") {
                reportDiagnostic(context.program, {
                  code: "move-to-wrong-type",
                  target: op,
                });
              } else {
                reportDiagnostic(context.program, {
                  code: "move-to-duplicate",
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
        crossLanguageDefinitionId: getNamespaceFullName(service),
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
): SdkOperationGroup | undefined {
  let operationGroup: SdkOperationGroup | undefined;
  const service =
    findOperationGroupService(context.program, type, context.emitterName) ?? (type as any);
  if (!isService(context.program, service)) {
    reportDiagnostic(context.program, {
      code: "client-service",
      format: { name: type.name },
      target: type,
    });
  }
  if (hasExplicitClientOrOperationGroup(context)) {
    operationGroup = getScopedDecoratorData(context, operationGroupKey, type);
    if (operationGroup) {
      operationGroup.groupPath = `${groupPathPrefix}.${getLibraryName(context, type)}`;
      operationGroup.service = service;
      operationGroup.subOperationGroups = [];

      if (type.kind === "Namespace") {
        operationGroup.subOperationGroups =
          buildHierarchyOfOperationGroups(context, type, operationGroup.groupPath) ?? [];
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
      };
    }

    if (operationGroup && type.kind === "Namespace") {
      operationGroup.subOperationGroups =
        buildHierarchyOfOperationGroups(context, type, operationGroup.groupPath) ?? [];
    }
  }

  // build operation group's cache
  if (operationGroup) {
    context.__rawClientsOperationGroupsCache!.set(operationGroup.type!, operationGroup);
    context.__clientToOperationsCache!.set(operationGroup, []);
  }

  return operationGroup;
}

function findOperationGroupService(
  program: Program,
  client: Namespace | Interface,
  scope: LanguageScopes,
): Namespace | Interface | undefined {
  let current: Namespace | undefined = client as any;
  while (current) {
    if (isService(program, current)) {
      // we don't check scoped clients here, because we want to find the service for the client
      return current;
    }
    const client = program.stateMap(clientKey).get(current);
    if (client && (client[scope] || client[AllScopes])) {
      return (client[scope] ?? client[AllScopes]).service;
    }
    current = current.namespace;
  }
  return undefined;
}

function buildHierarchyOfOperationGroups(
  context: TCGCContext,
  type: Namespace,
  groupPathPrefix: string,
): SdkOperationGroup[] | undefined {
  // build hierarchy of operation group
  const subOperationGroups: SdkOperationGroup[] = [];
  type.namespaces.forEach((ns) => {
    const subOperationGroup = createOperationGroup(context, ns, groupPathPrefix);
    if (subOperationGroup) {
      subOperationGroups.push(subOperationGroup);
    }
  });
  type.interfaces.forEach((i) => {
    const subOperationGroup = createOperationGroup(context, i, groupPathPrefix);
    if (subOperationGroup) {
      subOperationGroups.push(subOperationGroup);
    }
  });
  if (subOperationGroups.length > 0) {
    return subOperationGroups;
  }
  return undefined;
}

function isArm(service: Namespace): boolean {
  return service.decorators.some(
    (decorator) => decorator.decorator.name === "$armProviderNamespace",
  );
}
