import {
  AugmentDecoratorStatementNode,
  compilerAssert,
  DecoratorContext,
  DecoratorExpressionNode,
  DecoratorFunction,
  Enum,
  EnumMember,
  getDiscriminator,
  getNamespaceFullName,
  getProjectedName,
  ignoreDiagnostics,
  Interface,
  isService,
  isTemplateDeclaration,
  isTemplateDeclarationOrInstance,
  listServices,
  Model,
  ModelProperty,
  Namespace,
  Node,
  Operation,
  Program,
  RekeyableMap,
  Scalar,
  SyntaxKind,
  Type,
  Union,
} from "@typespec/compiler";
import {
  unsafe_mutateSubgraph,
  unsafe_mutateSubgraphWithNamespace,
  unsafe_MutatorWithNamespace,
} from "@typespec/compiler/experimental";
import { getVersioningMutators, getVersions } from "@typespec/versioning";
import {
  AccessDecorator,
  AlternateTypeDecorator,
  ApiVersionDecorator,
  ClientDecorator,
  ClientInitializationDecorator,
  ClientNameDecorator,
  ClientNamespaceDecorator,
  ConvenientAPIDecorator,
  FlattenPropertyDecorator,
  OperationGroupDecorator,
  ParamAliasDecorator,
  ProtocolAPIDecorator,
  ScopeDecorator,
  UsageDecorator,
} from "../generated-defs/Azure.ClientGenerator.Core.js";
import {
  AccessFlags,
  ClientInitializationOptions,
  LanguageScopes,
  SdkClient,
  SdkInitializationType,
  SdkMethodParameter,
  SdkModelPropertyType,
  SdkOperationGroup,
  TCGCContext,
  UsageFlags,
} from "./interfaces.js";
import {
  AllScopes,
  clientNameKey,
  clientNamespaceKey,
  findRootSourceProperty,
  getValidApiVersion,
  negationScopesKey,
  scopeKey,
} from "./internal-utils.js";
import { createStateSymbol, reportDiagnostic } from "./lib.js";
import { getLibraryName } from "./public-utils.js";
import { getSdkEnum, getSdkModel, getSdkUnion } from "./types.js";

export const namespace = "Azure.ClientGenerator.Core";

function getScopedDecoratorData(
  context: TCGCContext,
  key: symbol,
  target: Type,
  languageScope?: string | typeof AllScopes,
): any {
  const retval: Record<string | symbol, any> = context.program.stateMap(key).get(target);
  if (retval === undefined) return retval;
  if (languageScope === AllScopes) {
    return retval[languageScope];
  }
  if (languageScope === undefined || typeof languageScope === "string") {
    const scope = languageScope ?? context.emitterName;
    if (Object.keys(retval).includes(scope)) return retval[scope];

    // if the scope is negated, we should return undefined
    // if the scope is not negated, we should return the value for AllScopes
    const negationScopes = retval[negationScopesKey];
    if (negationScopes !== undefined && negationScopes.includes(scope)) {
      return undefined;
    }
  }
  return retval[AllScopes]; // in this case it applies to all languages
}

function listScopedDecoratorData(context: TCGCContext, key: symbol): any[] {
  const retval = [...context.program.stateMap(key).values()];
  return retval
    .filter((targetEntry) => {
      return targetEntry[context.emitterName] || targetEntry[AllScopes];
    })
    .flatMap((targetEntry) => targetEntry[context.emitterName] ?? targetEntry[AllScopes]);
}

function setScopedDecoratorData(
  context: DecoratorContext,
  decorator: DecoratorFunction,
  key: symbol,
  target: Type,
  value: unknown,
  scope?: LanguageScopes,
) {
  // if no scope specified, then set with the new value
  if (!scope) {
    context.program.stateMap(key).set(target, Object.fromEntries([[AllScopes, value]]));
    return;
  }

  const targetEntry = context.program.stateMap(key).get(target);
  const [negationScopes, scopes] = parseScopes(context, scope);
  if (negationScopes !== undefined && negationScopes.length > 0) {
    // override the previous value for negation scopes
    const newObject: Record<string | symbol, any> =
      scopes !== undefined && scopes.length > 0
        ? Object.fromEntries([AllScopes, ...scopes].map((scope) => [scope, value]))
        : Object.fromEntries([[AllScopes, value]]);
    newObject[negationScopesKey] = negationScopes;
    context.program.stateMap(key).set(target, newObject);

    // if a scope exists in the target entry and it overlaps with the negation scope, it means negation scope doesn't override it
    if (targetEntry !== undefined) {
      const existingScopes = Object.getOwnPropertyNames(targetEntry);
      const intersections = existingScopes.filter((x) => negationScopes.includes(x));
      if (intersections !== undefined && intersections.length > 0) {
        for (const scopeToKeep of intersections) {
          newObject[scopeToKeep] = targetEntry[scopeToKeep];
        }
      }
    }
  } else if (scopes !== undefined && scopes.length > 0) {
    // for normal scopes, add them incrementally
    const newObject = Object.fromEntries(scopes.map((scope) => [scope, value]));
    context.program
      .stateMap(key)
      .set(target, !targetEntry ? newObject : { ...targetEntry, ...newObject });
  }
}

function parseScopes(context: DecoratorContext, scope?: LanguageScopes): [string[]?, string[]?] {
  if (scope === undefined) {
    return [undefined, undefined];
  }

  // handle !(scope1, scope2,...) syntax
  const negationScopeRegex = new RegExp(/!\((.*?)\)/);
  const negationScopeMatch = scope.match(negationScopeRegex);
  if (negationScopeMatch) {
    return [negationScopeMatch[1].split(",").map((s) => s.trim()), undefined];
  }

  // handle !scope1, !scope2, scope3, ... syntax
  const splitScopes = scope.split(",").map((s) => s.trim());
  const negationScopes: string[] = [];
  const scopes: string[] = [];
  for (const s of splitScopes) {
    if (s.startsWith("!")) {
      negationScopes.push(s.slice(1));
    } else {
      scopes.push(s);
    }
  }
  return [negationScopes, scopes];
}

const clientKey = createStateSymbol("client");

function isArm(service: Namespace): boolean {
  return service.decorators.some(
    (decorator) => decorator.decorator.name === "$armProviderNamespace",
  );
}

export const $client: ClientDecorator = (
  context: DecoratorContext,
  target: Namespace | Interface,
  options?: Model,
  scope?: LanguageScopes,
) => {
  if ((context.decoratorTarget as Node).kind === SyntaxKind.AugmentDecoratorStatement) {
    reportDiagnostic(context.program, {
      code: "wrong-client-decorator",
      target: context.decoratorTarget,
    });
    return;
  }
  const explicitName = options?.properties.get("name")?.type;
  const name: string = explicitName?.kind === "String" ? explicitName.value : target.name;
  const explicitService = options?.properties.get("service")?.type;
  const service =
    explicitService?.kind === "Namespace"
      ? explicitService
      : (findClientService(context.program, target) ?? (target as any));
  if (!name.endsWith("Client")) {
    reportDiagnostic(context.program, {
      code: "client-name",
      format: { name },
      target: context.decoratorTarget,
    });
  }

  if (!isService(context.program, service)) {
    reportDiagnostic(context.program, {
      code: "client-service",
      format: { name },
      target: context.decoratorTarget,
    });
  }

  const client: SdkClient = {
    kind: "SdkClient",
    name,
    service,
    type: target,
    crossLanguageDefinitionId: `${getNamespaceFullName(service)}.${name}`,
  };
  setScopedDecoratorData(context, $client, clientKey, target, client, scope);
};

function findClientService(
  program: Program,
  client: Namespace | Interface,
): Namespace | Interface | undefined {
  let current: Namespace | undefined = client as any;
  while (current) {
    if (isService(program, current)) {
      return current;
    }
    current = current.namespace;
  }
  return undefined;
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

/**
 * Return the client object for the given namespace or interface, or undefined if the given namespace or interface is not a client.
 *
 * @param context TCGCContext
 * @param type Type to check
 * @returns Client or undefined
 */
export function getClient(
  context: TCGCContext,
  type: Namespace | Interface,
): SdkClient | undefined {
  for (const client of listClients(context)) {
    if (client.type === type) {
      return client;
    }
  }
  return undefined;
}

function hasExplicitClientOrOperationGroup(context: TCGCContext): boolean {
  return (
    listScopedDecoratorData(context, clientKey).length > 0 ||
    listScopedDecoratorData(context, operationGroupKey).length > 0
  );
}

function updateClientWithVersioning(context: TCGCContext, client: SdkClient) {
  if (!context.__versioning_client_type_cache) {
    context.__versioning_client_type_cache = new Map();
  }

  if (context.__versioning_client_type_cache.has(client.type)) {
    client.type = context.__versioning_client_type_cache.get(client.type)!;
  } else {
    const allApiVersions = getVersions(context.program, client.service)[1]
      ?.getVersions()
      .map((x) => x.value);
    if (!allApiVersions) return;
    const apiVersion = getValidApiVersion(context, allApiVersions);
    if (apiVersion === undefined) return;

    const mutator = getVersioningMutator(context, client.service, apiVersion);
    if (client.type.kind === "Namespace") {
      const subgraph = unsafe_mutateSubgraphWithNamespace(context.program, [mutator], client.type);
      compilerAssert(subgraph.type.kind === "Namespace", "Should not have mutated to another type");
      context.__versioning_client_type_cache.set(client.type, subgraph.type);
      client.type = subgraph.type;
    } else {
      const subgraph = unsafe_mutateSubgraph(context.program, [mutator], client.type);
      compilerAssert(subgraph.type.kind === "Interface", "Should not have mutated to another type");
      context.__versioning_client_type_cache.set(client.type, subgraph.type);
      client.type = subgraph.type;
    }
  }
}

function getVersioningMutator(
  context: TCGCContext,
  service: Namespace,
  apiVersion: string,
): unsafe_MutatorWithNamespace {
  const versionMutator = getVersioningMutators(context.program, service);
  compilerAssert(
    versionMutator !== undefined && versionMutator.kind !== "transient",
    "Versioning service should not get undefined or transient versioning mutator",
  );

  const mutators = versionMutator.snapshots
    .filter((snapshot) => apiVersion === snapshot.version.value)
    .map((x) => x.mutator);
  compilerAssert(mutators.length === 1, "One api version should not get multiple mutators");

  return mutators[0];
}

function getVersioningClients(context: TCGCContext, clients: SdkClient[]): SdkClient[] {
  if (context.apiVersion !== "all") {
    const versioningClients = [];
    for (const client of clients) {
      const versioningClient = { ...client };
      updateClientWithVersioning(context, versioningClient);
      // filter client not existed in the current version
      if ((versioningClient.type as Type).kind !== "Intrinsic") {
        versioningClients.push(versioningClient);
      }
    }
    return versioningClients;
  }
  return clients;
}

/**
 * List all the clients.
 *
 * @param context TCGCContext
 * @returns Array of clients
 */
export function listClients(context: TCGCContext): SdkClient[] {
  if (context.__rawClients) return context.__rawClients;

  const explicitClients = [...listScopedDecoratorData(context, clientKey)];
  if (explicitClients.length > 0) {
    context.__rawClients = getVersioningClients(context, explicitClients);
    if (context.__rawClients.some((client) => isArm(client.service))) {
      context.arm = true;
    }
    return context.__rawClients;
  }

  // if there is no explicit client, we will treat namespaces with service decorator as clients
  const services = listServices(context.program);

  const clients: SdkClient[] = services.map((service) => {
    let originalName = service.type.name;
    const clientNameOverride = getClientNameOverride(context, service.type);
    if (clientNameOverride) {
      originalName = clientNameOverride;
    } else {
      originalName = getProjectedName(context.program, service.type, "client") ?? service.type.name;
    }
    const clientName = originalName.endsWith("Client") ? originalName : `${originalName}Client`;
    context.arm = isArm(service.type);
    return {
      kind: "SdkClient",
      name: clientName,
      service: service.type,
      type: service.type,
      crossLanguageDefinitionId: getNamespaceFullName(service.type),
    };
  });

  context.__rawClients = getVersioningClients(context, clients);
  return context.__rawClients;
}

const operationGroupKey = createStateSymbol("operationGroup");

export const $operationGroup: OperationGroupDecorator = (
  context: DecoratorContext,
  target: Namespace | Interface,
  scope?: LanguageScopes,
) => {
  if ((context.decoratorTarget as Node).kind === SyntaxKind.AugmentDecoratorStatement) {
    reportDiagnostic(context.program, {
      code: "wrong-client-decorator",
      target: context.decoratorTarget,
    });
    return;
  }

  setScopedDecoratorData(
    context,
    $operationGroup,
    operationGroupKey,
    target,
    {
      kind: "SdkOperationGroup",
      type: target,
    },
    scope,
  );
};

/**
 * Check a namespace or interface is an operation group.
 * @param context TCGCContext
 * @param type Type to check
 * @returns boolean
 */
export function isOperationGroup(context: TCGCContext, type: Namespace | Interface): boolean {
  if (hasExplicitClientOrOperationGroup(context)) {
    return getScopedDecoratorData(context, operationGroupKey, type) !== undefined;
  }
  // if there is no explicit client, we will treat non-client namespaces and all interfaces as operation group
  if (type.kind === "Interface" && !isTemplateDeclaration(type)) {
    return true;
  }
  if (type.kind === "Namespace" && !type.decorators.some((t) => t.decorator.name === "$service")) {
    return true;
  }
  return false;
}
/**
 * Check an operation is in an operation group.
 * @param context TCGCContext
 * @param type Type to check
 * @returns boolean
 */
export function isInOperationGroup(
  context: TCGCContext,
  type: Namespace | Interface | Operation,
): boolean {
  switch (type.kind) {
    case "Operation":
      return type.interface
        ? isInOperationGroup(context, type.interface)
        : type.namespace
          ? isInOperationGroup(context, type.namespace)
          : false;
    case "Interface":
    case "Namespace":
      return (
        isOperationGroup(context, type) ||
        (type.namespace ? isInOperationGroup(context, type.namespace) : false)
      );
  }
}

function buildOperationGroupPath(context: TCGCContext, type: Namespace | Interface): string {
  const path = [];
  while (true) {
    const client = getClient(context, type);
    if (client) {
      path.push(client.name);
      break;
    }
    if (isOperationGroup(context, type)) {
      path.push(getLibraryName(context, type));
    }
    if (type.namespace) {
      type = type.namespace;
    } else {
      break;
    }
  }
  return path.reverse().join(".");
}

/**
 * Return the operation group object for the given namespace or interface or undefined is not an operation group.
 * @param context TCGCContext
 * @param type Type to check
 * @returns Operation group or undefined.
 */
export function getOperationGroup(
  context: TCGCContext,
  type: Namespace | Interface,
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
      operationGroup.groupPath = buildOperationGroupPath(context, type);
      operationGroup.service = service;
    }
  } else {
    // if there is no explicit client, we will treat non-client namespaces and all interfaces as operation group
    if (type.kind === "Interface" && !isTemplateDeclaration(type)) {
      operationGroup = {
        kind: "SdkOperationGroup",
        type,
        groupPath: buildOperationGroupPath(context, type),
        service,
      };
    }
    if (
      type.kind === "Namespace" &&
      !type.decorators.some((t) => t.decorator.name === "$service")
    ) {
      operationGroup = {
        kind: "SdkOperationGroup",
        type,
        groupPath: buildOperationGroupPath(context, type),
        service,
      };
    }
  }

  // build hierarchy of operation group
  if (operationGroup && type.kind === "Namespace") {
    const subOperationGroups: SdkOperationGroup[] = [];
    type.namespaces.forEach((ns) => {
      const subOperationGroup = getOperationGroup(context, ns);
      if (subOperationGroup) {
        subOperationGroups.push(subOperationGroup);
      }
    });
    type.interfaces.forEach((i) => {
      const subOperationGroup = getOperationGroup(context, i);
      if (subOperationGroup) {
        subOperationGroups.push(subOperationGroup);
      }
    });
    if (subOperationGroups.length > 0) {
      operationGroup.subOperationGroups = subOperationGroups;
    }
  }

  return operationGroup;
}

/**
 * List all the operation groups inside a client or an operation group. If ignoreHierarchy is true, the result will include all nested operation groups.
 *
 * @param context TCGCContext
 * @param group Client or operation group to list operation groups
 * @param ignoreHierarchy Whether to get all nested operation groups
 * @returns
 */
export function listOperationGroups(
  context: TCGCContext,
  group: SdkClient | SdkOperationGroup,
  ignoreHierarchy = false,
): SdkOperationGroup[] {
  const groups: SdkOperationGroup[] = [];

  if (group.type.kind === "Interface") {
    return groups;
  }

  for (const subItem of group.type.namespaces.values()) {
    track(getOperationGroup(context, subItem)!);
  }
  for (const subItem of group.type.interfaces.values()) {
    track(getOperationGroup(context, subItem)!);
  }

  function track(item: SdkOperationGroup | undefined) {
    if (!item) {
      return;
    }
    groups.push(item);
    if (ignoreHierarchy) {
      for (const subItem of item.subOperationGroups ?? []) {
        track(subItem);
      }
    }
  }

  return groups;
}

/**
 * List operations inside a client or an operation group. If ignoreHierarchy is true, the result will include all nested operations.
 * @param program TCGCContext
 * @param group Client or operation group to list operations
 * @param ignoreHierarchy Whether to get all nested operations
 * @returns
 */
export function listOperationsInOperationGroup(
  context: TCGCContext,
  group: SdkOperationGroup | SdkClient,
  ignoreHierarchy = false,
): Operation[] {
  const operations: Operation[] = [];

  function addOperations(current: Namespace | Interface) {
    if (
      current !== group.type &&
      !ignoreHierarchy &&
      (getClient(context, current) || isOperationGroup(context, current))
    ) {
      return;
    }
    if (current.kind === "Interface" && isTemplateDeclaration(current)) {
      // Skip template interface operations
      return;
    }

    for (const op of current.operations.values()) {
      if (!IsInScope(context, op)) {
        continue;
      }

      // Skip templated operations and omit operations
      if (
        !isTemplateDeclarationOrInstance(op) &&
        !context.program.stateMap(omitOperation).get(op)
      ) {
        operations.push(op);
      }
    }

    if (current.kind === "Namespace") {
      for (const subItem of current.namespaces.values()) {
        addOperations(subItem);
      }
      for (const subItem of current.interfaces.values()) {
        addOperations(subItem);
      }
    }
  }

  addOperations(group.type);
  return operations;
}

const protocolAPIKey = createStateSymbol("protocolAPI");

export const $protocolAPI: ProtocolAPIDecorator = (
  context: DecoratorContext,
  entity: Operation,
  value?: boolean,
  scope?: LanguageScopes,
) => {
  setScopedDecoratorData(context, $protocolAPI, protocolAPIKey, entity, value, scope);
};

const convenientAPIKey = createStateSymbol("convenientAPI");

export const $convenientAPI: ConvenientAPIDecorator = (
  context: DecoratorContext,
  entity: Operation,
  value?: boolean,
  scope?: LanguageScopes,
) => {
  setScopedDecoratorData(context, $convenientAPI, convenientAPIKey, entity, value, scope);
};

export function shouldGenerateProtocol(context: TCGCContext, entity: Operation): boolean {
  const value = getScopedDecoratorData(context, protocolAPIKey, entity);
  return value ?? Boolean(context.generateProtocolMethods);
}

export function shouldGenerateConvenient(context: TCGCContext, entity: Operation): boolean {
  const value = getScopedDecoratorData(context, convenientAPIKey, entity);
  return value ?? Boolean(context.generateConvenienceMethods);
}

const usageKey = createStateSymbol("usage");

export const $usage: UsageDecorator = (
  context: DecoratorContext,
  entity: Model | Enum | Union | Namespace,
  value: EnumMember | Union,
  scope?: LanguageScopes,
) => {
  const isValidValue = (value: number): boolean => value === 2 || value === 4;

  if (value.kind === "EnumMember") {
    if (typeof value.value === "number" && isValidValue(value.value)) {
      setScopedDecoratorData(context, $usage, usageKey, entity, value.value, scope);
      return;
    }
  } else {
    let usage = 0;
    for (const variant of value.variants.values()) {
      if (variant.type.kind === "EnumMember" && typeof variant.type.value === "number") {
        if (isValidValue(variant.type.value)) {
          usage |= variant.type.value;
        }
      } else {
        break;
      }
    }

    if (usage !== 0) {
      setScopedDecoratorData(context, $usage, usageKey, entity, usage, scope);
      return;
    }
  }

  reportDiagnostic(context.program, {
    code: "invalid-usage",
    format: {},
    target: entity,
  });
};

export function getUsageOverride(
  context: TCGCContext,
  entity: Model | Enum | Union,
): number | undefined {
  const usageFlags = getScopedDecoratorData(context, usageKey, entity);
  if (usageFlags || entity.namespace === undefined) return usageFlags;
  return getScopedDecoratorData(context, usageKey, entity.namespace);
}

export function getUsage(context: TCGCContext, entity: Model | Enum | Union): UsageFlags {
  switch (entity.kind) {
    case "Union":
      const type = getSdkUnion(context, entity);
      if (type.kind === "enum" || type.kind === "union" || type.kind === "nullable") {
        return type.usage;
      }
      return UsageFlags.None;
    case "Model":
      return getSdkModel(context, entity).usage;
    case "Enum":
      return getSdkEnum(context, entity).usage;
  }
}

const accessKey = createStateSymbol("access");

export const $access: AccessDecorator = (
  context: DecoratorContext,
  entity: Model | Enum | Operation | Union | Namespace,
  value: EnumMember,
  scope?: LanguageScopes,
) => {
  if (typeof value.value !== "string" || (value.value !== "public" && value.value !== "internal")) {
    reportDiagnostic(context.program, {
      code: "access",
      format: {},
      target: entity,
    });
    return;
  }
  setScopedDecoratorData(context, $access, accessKey, entity, value.value, scope);
};

export function getAccessOverride(
  context: TCGCContext,
  entity: Model | Enum | Operation | Union | Namespace,
): AccessFlags | undefined {
  const accessOverride = getScopedDecoratorData(context, accessKey, entity);

  if (!accessOverride && entity.namespace) {
    return getAccessOverride(context, entity.namespace);
  }

  return accessOverride;
}

export function getAccess(context: TCGCContext, entity: Model | Enum | Operation | Union) {
  const override = getAccessOverride(context, entity);
  if (override || entity.kind === "Operation") {
    return override || "public";
  }

  switch (entity.kind) {
    case "Model":
      return getSdkModel(context, entity).access;
    case "Enum":
      return getSdkEnum(context, entity).access;
    case "Union": {
      const type = getSdkUnion(context, entity);
      if (type.kind === "enum" || type.kind === "union" || type.kind === "nullable") {
        return type.access;
      }
      return "public";
    }
  }
}

const flattenPropertyKey = createStateSymbol("flattenPropertyKey");
/**
 * Whether a model property should be flattened.
 *
 * @param context DecoratorContext
 * @param target ModelProperty to mark as flattened
 * @param scope Names of the projection (e.g. "python", "csharp", "java", "javascript")
 * @deprecated This decorator is not recommended to use.
 */
export const $flattenProperty: FlattenPropertyDecorator = (
  context: DecoratorContext,
  target: ModelProperty,
  scope?: LanguageScopes,
) => {
  if (getDiscriminator(context.program, target.type)) {
    reportDiagnostic(context.program, {
      code: "flatten-polymorphism",
      format: {},
      target: target,
    });
    return;
  }
  setScopedDecoratorData(context, $flattenProperty, flattenPropertyKey, target, true, scope); // eslint-disable-line @typescript-eslint/no-deprecated
};

/**
 * Whether a model property should be flattened or not.
 *
 * @param context TCGCContext
 * @param target ModelProperty that we want to check whether it should be flattened or not
 * @returns whether the model property should be flattened or not
 */
export function shouldFlattenProperty(context: TCGCContext, target: ModelProperty): boolean {
  return getScopedDecoratorData(context, flattenPropertyKey, target) ?? false;
}

export const $clientName: ClientNameDecorator = (
  context: DecoratorContext,
  entity: Type,
  value: string,
  scope?: LanguageScopes,
) => {
  // workaround for current lack of functionality in compiler
  // https://github.com/microsoft/typespec/issues/2717
  if (entity.kind === "Model" || entity.kind === "Operation") {
    if ((context.decoratorTarget as Node).kind === SyntaxKind.AugmentDecoratorStatement) {
      if (
        ignoreDiagnostics(
          context.program.checker.resolveTypeReference(
            (context.decoratorTarget as AugmentDecoratorStatementNode).targetType,
          ),
        )?.node !== entity.node
      ) {
        return;
      }
    }
    if ((context.decoratorTarget as Node).kind === SyntaxKind.DecoratorExpression) {
      if ((context.decoratorTarget as DecoratorExpressionNode).parent !== entity.node) {
        return;
      }
    }
  }
  if (value.trim() === "") {
    reportDiagnostic(context.program, {
      code: "empty-client-name",
      format: {},
      target: entity,
    });
    return;
  }
  setScopedDecoratorData(context, $clientName, clientNameKey, entity, value, scope);
};

export function getClientNameOverride(
  context: TCGCContext,
  entity: Type,
  languageScope?: string | typeof AllScopes,
): string | undefined {
  return getScopedDecoratorData(context, clientNameKey, entity, languageScope);
}

const overrideKey = createStateSymbol("override");
const omitOperation = createStateSymbol("omitOperation");

// Recursive function to collect parameter names
function collectParams(
  properties: RekeyableMap<string, ModelProperty>,
  params: ModelProperty[] = [],
): ModelProperty[] {
  properties.forEach((value, key) => {
    // If the property is of type 'model', recurse into its properties
    if (params.filter((x) => compareModelProperties(x, value)).length === 0) {
      if (value.type.kind === "Model") {
        collectParams(value.type.properties, params);
      } else {
        params.push(findRootSourceProperty(value));
      }
    }
  });

  return params;
}

function compareModelProperties(modelPropA: ModelProperty, modelPropB: ModelProperty): boolean {
  // can't rely fully on equals because the `.model` property may be different
  return (
    modelPropA.name === modelPropB.name &&
    modelPropA.type === modelPropB.type &&
    modelPropA.node === modelPropB.node
  );
}

export const $override = (
  context: DecoratorContext,
  original: Operation,
  override: Operation,
  scope?: LanguageScopes,
) => {
  // omit all override operation
  context.program.stateMap(omitOperation).set(override, true);

  // Extract and sort parameter names
  const originalParams = collectParams(original.parameters.properties).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const overrideParams = collectParams(override.parameters.properties).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  // Check if the sorted parameter names arrays are equal
  const parametersMatch =
    originalParams.length === overrideParams.length &&
    originalParams.every((value, index) => compareModelProperties(value, overrideParams[index]));

  if (!parametersMatch) {
    reportDiagnostic(context.program, {
      code: "override-method-parameters-mismatch",
      target: context.decoratorTarget,
      format: {
        methodName: original.name,
        originalParameters: originalParams.map((x) => x.name).join(`", "`),
        overrideParameters: overrideParams.map((x) => x.name).join(`", "`),
      },
    });
    return;
  }
  setScopedDecoratorData(context, $override, overrideKey, original, override, scope);
};

/**
 * Gets additional information on how to serialize / deserialize TYPESPEC standard types depending
 * on whether additional serialization information is provided or needed
 *
 * @param context the Sdk Context
 * @param entity the entity whose client format we are going to get
 * @returns the format in which to serialize the typespec type or undefined
 */
export function getOverriddenClientMethod(
  context: TCGCContext,
  entity: Operation,
): Operation | undefined {
  return getScopedDecoratorData(context, overrideKey, entity);
}

const alternateTypeKey = createStateSymbol("alternateType");

/**
 * Replace a source type with an alternate type in a specific scope.
 *
 * @param context the decorator context
 * @param source source type to be replaced
 * @param alternate target type to replace the source type
 * @param scope Names of the projection (e.g. "python", "csharp", "java", "javascript")
 */
export const $alternateType: AlternateTypeDecorator = (
  context: DecoratorContext,
  source: ModelProperty | Scalar,
  alternate: Scalar,
  scope?: LanguageScopes,
) => {
  if (source.kind === "ModelProperty" && source.type.kind !== "Scalar") {
    reportDiagnostic(context.program, {
      code: "invalid-alternate-source-type",
      format: {
        typeName: source.type.kind,
      },
      target: source,
    });
    return;
  }
  setScopedDecoratorData(context, $alternateType, alternateTypeKey, source, alternate, scope);
};

/**
 * Get the alternate type for a source type in a specific scope.
 *
 * @param context the Sdk Context
 * @param source source type to be replaced
 * @returns alternate type to replace the source type, or undefined if no alternate type is found
 */
export function getAlternateType(
  context: TCGCContext,
  source: ModelProperty | Scalar,
): Scalar | undefined {
  return getScopedDecoratorData(context, alternateTypeKey, source);
}

export const $useSystemTextJsonConverter: DecoratorFunction = (
  context: DecoratorContext,
  entity: Model,
  scope?: LanguageScopes,
) => {};

const clientInitializationKey = createStateSymbol("clientInitialization");

export const $clientInitialization: ClientInitializationDecorator = (
  context: DecoratorContext,
  target: Namespace | Interface,
  options: Type,
  scope?: LanguageScopes,
) => {
  if (options.kind === "Model") {
    if (options.properties.get("initializedBy")) {
      const value = options.properties.get("initializedBy")!.type;

      const isValidValue = (value: number): boolean => value === 1 || value === 2;

      if (value.kind === "EnumMember") {
        if (typeof value.value !== "number" || !isValidValue(value.value)) {
          reportDiagnostic(context.program, {
            code: "invalid-initialized-by",
            format: { message: "Please use `InitializedBy` enum to set the value." },
            target: target,
          });
          return;
        }
      } else if (value.kind === "Union") {
        for (const variant of value.variants.values()) {
          if (
            variant.type.kind !== "EnumMember" ||
            typeof variant.type.value !== "number" ||
            !isValidValue(variant.type.value)
          ) {
            reportDiagnostic(context.program, {
              code: "invalid-initialized-by",
              format: { message: "Please use `InitializedBy` enum to set the value." },
              target: target,
            });
            return;
          }
        }
      }
    }

    setScopedDecoratorData(
      context,
      $clientInitialization,
      clientInitializationKey,
      target,
      options,
      scope,
    );
  }
};

/**
 * Get `SdkInitializationType` for namespace or interface. The info is from `@clientInitialization` decorator.
 *
 * @param context
 * @param entity namespace or interface which represents a client
 * @returns
 * @deprecated This function is deprecated. Use `getClientInitializationOptions` instead.
 */
export function getClientInitialization(
  context: TCGCContext,
  entity: Namespace | Interface,
): SdkInitializationType | undefined {
  let options = getScopedDecoratorData(context, clientInitializationKey, entity);
  if (options === undefined) return undefined;
  // backward compatibility
  if (options.properties.get("parameters")) {
    options = options.properties.get("parameters").type;
  } else if (options.properties.get("initializedBy")) {
    return undefined;
  }
  const sdkModel = getSdkModel(context, options);
  const initializationProps = sdkModel.properties.map(
    (property: SdkModelPropertyType): SdkMethodParameter => {
      property.onClient = true;
      property.kind = "method";
      return property as SdkMethodParameter;
    },
  );
  return {
    ...sdkModel,
    properties: initializationProps,
  };
}

/**
 * Get client initialization options for namespace or interface. The info is from `@clientInitialization` decorator.
 *
 * @param context
 * @param entity namespace or interface which represents a client
 * @returns
 */
export function getClientInitializationOptions(
  context: TCGCContext,
  entity: Namespace | Interface,
): ClientInitializationOptions | undefined {
  const options = getScopedDecoratorData(context, clientInitializationKey, entity);
  if (options === undefined) return undefined;

  // backward compatibility
  if (
    options.properties.get("initializedBy") === undefined &&
    options.properties.get("parameters") === undefined
  ) {
    return {
      parameters: options,
    };
  }

  let initializedBy = undefined;

  if (options.properties.get("initializedBy")) {
    if (options.properties.get("initializedBy").type.kind === "EnumMember") {
      initializedBy = options.properties.get("initializedBy").type.value;
    } else if (options.properties.get("initializedBy").type.kind === "Union") {
      initializedBy = 0;
      for (const variant of options.properties.get("initializedBy").type.variants.values()) {
        initializedBy |= variant.type.value;
      }
    }
  }

  return {
    parameters: options.properties.get("parameters")?.type,
    initializedBy: initializedBy,
  };
}

const paramAliasKey = createStateSymbol("paramAlias");

export const $paramAlias: ParamAliasDecorator = (
  context: DecoratorContext,
  original: ModelProperty,
  paramAlias: string,
  scope?: LanguageScopes,
) => {
  setScopedDecoratorData(context, $paramAlias, paramAliasKey, original, paramAlias, scope);
};

export function getParamAlias(context: TCGCContext, original: ModelProperty): string | undefined {
  return getScopedDecoratorData(context, paramAliasKey, original);
}

const apiVersionKey = createStateSymbol("apiVersion");

export const $apiVersion: ApiVersionDecorator = (
  context: DecoratorContext,
  target: ModelProperty,
  value?: boolean,
  scope?: LanguageScopes,
) => {
  setScopedDecoratorData(context, $apiVersion, apiVersionKey, target, value ?? true, scope);
};

export function getIsApiVersion(context: TCGCContext, param: ModelProperty): boolean | undefined {
  return getScopedDecoratorData(context, apiVersionKey, param);
}

export const $clientNamespace: ClientNamespaceDecorator = (
  context: DecoratorContext,
  entity: Namespace | Interface | Model | Enum | Union,
  value: string,
  scope?: LanguageScopes,
) => {
  if (value.trim() === "") {
    reportDiagnostic(context.program, {
      code: "empty-client-namespace",
      format: {},
      target: entity,
    });
    return;
  }
  setScopedDecoratorData(context, $clientNamespace, clientNamespaceKey, entity, value, scope);
};

export function getClientNamespace(
  context: TCGCContext,
  entity: Namespace | Interface | Model | Enum | Union,
): string {
  const override = getScopedDecoratorData(context, clientNamespaceKey, entity);
  if (override) return override;
  if (!entity.namespace) {
    return "";
  }
  if (entity.kind === "Namespace") {
    return getNamespaceFullNameWithOverride(context, entity);
  }
  return getNamespaceFullNameWithOverride(context, entity.namespace);
}

function getNamespaceFullNameWithOverride(context: TCGCContext, namespace: Namespace): string {
  const segments = [];
  let current: Namespace | undefined = namespace;
  while (current && current.name !== "") {
    const override = getScopedDecoratorData(context, clientNamespaceKey, current);
    if (override) {
      segments.unshift(override);
      break;
    }
    segments.unshift(current.name);
    current = current.namespace;
  }
  return segments.join(".");
}

export const $scope: ScopeDecorator = (
  context: DecoratorContext,
  entity: Operation,
  scope?: LanguageScopes,
) => {
  const [negationScopes, scopes] = parseScopes(context, scope);
  if (negationScopes !== undefined && negationScopes.length > 0) {
    // for negation scope, override the previous value
    setScopedDecoratorData(context, $scope, negationScopesKey, entity, negationScopes);
  }
  if (scopes !== undefined && scopes.length > 0) {
    // for normal scope, add them incrementally
    const targetEntry = context.program.stateMap(scopeKey).get(entity);
    setScopedDecoratorData(
      context,
      $scope,
      scopeKey,
      entity,
      !targetEntry ? scopes : [...Object.values(targetEntry), ...scopes],
    );
  }
};

function IsInScope(context: TCGCContext, entity: Operation): boolean {
  const scopes = getScopedDecoratorData(context, scopeKey, entity);
  if (scopes !== undefined && scopes.includes(context.emitterName)) {
    return true;
  }

  const negationScopes = getScopedDecoratorData(context, negationScopesKey, entity);
  if (negationScopes !== undefined && negationScopes.includes(context.emitterName)) {
    return false;
  }
  return true;
}
