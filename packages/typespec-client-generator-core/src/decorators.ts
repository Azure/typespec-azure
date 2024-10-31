import {
  AugmentDecoratorStatementNode,
  DecoratorContext,
  DecoratorExpressionNode,
  DecoratorFunction,
  EmitContext,
  Enum,
  EnumMember,
  Interface,
  Model,
  ModelProperty,
  Namespace,
  Node,
  Operation,
  Program,
  RekeyableMap,
  SyntaxKind,
  Type,
  Union,
  createDiagnosticCollector,
  getDiscriminator,
  getNamespaceFullName,
  getProjectedName,
  ignoreDiagnostics,
  isService,
  isTemplateDeclaration,
  isTemplateDeclarationOrInstance,
  listServices,
  projectProgram,
} from "@typespec/compiler";
import { buildVersionProjections, getVersions } from "@typespec/versioning";
import {
  AccessDecorator,
  ClientDecorator,
  ClientInitializationDecorator,
  ClientNameDecorator,
  ConvenientAPIDecorator,
  FlattenPropertyDecorator,
  OperationGroupDecorator,
  ParamAliasDecorator,
  ProtocolAPIDecorator,
  UsageDecorator,
} from "../generated-defs/Azure.ClientGenerator.Core.js";
import { defaultDecoratorsAllowList } from "./configs.js";
import { handleClientExamples } from "./example.js";
import {
  AccessFlags,
  LanguageScopes,
  SdkClient,
  SdkContext,
  SdkEmitterOptions,
  SdkHttpOperation,
  SdkInitializationType,
  SdkMethodParameter,
  SdkModelPropertyType,
  SdkOperationGroup,
  SdkServiceOperation,
  TCGCContext,
  UsageFlags,
} from "./interfaces.js";
import {
  AllScopes,
  clientNameKey,
  getValidApiVersion,
  isAzureCoreTspModel,
  parseEmitterName,
} from "./internal-utils.js";
import { createStateSymbol, reportDiagnostic } from "./lib.js";
import { getSdkPackage } from "./package.js";
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

  // if scope specified, create or overwrite with the new value
  const splitScopes = scope.split(",").map((s) => s.trim());
  const targetEntry = context.program.stateMap(key).get(target);

  // if target doesn't exist in decorator map, create a new entry
  if (!targetEntry) {
    const newObject = Object.fromEntries(splitScopes.map((scope) => [scope, value]));
    context.program.stateMap(key).set(target, newObject);
    return;
  }

  // if target exists, overwrite existed value
  const newObject = Object.fromEntries(splitScopes.map((scope) => [scope, value]));
  context.program.stateMap(key).set(target, { ...targetEntry, ...newObject });
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

function serviceVersioningProjection(context: TCGCContext, client: SdkClient) {
  if (!context.__service_projection) {
    context.__service_projection = new Map();
  }

  let projectedService;
  let projectedProgram;

  if (context.__service_projection.has(client.service)) {
    [projectedService, projectedProgram] = context.__service_projection.get(client.service)!;
  } else {
    const allApiVersions = getVersions(context.program, client.service)[1]
      ?.getVersions()
      .map((x) => x.value);
    if (!allApiVersions) return;
    const apiVersion = getValidApiVersion(context, allApiVersions);
    if (apiVersion === undefined) return;
    const versionProjections = buildVersionProjections(context.program, client.service).filter(
      (v) => apiVersion === v.version,
    );
    if (versionProjections.length !== 1)
      throw new Error("Version projects should only contain one element");
    const projectedVersion = versionProjections[0];
    if (projectedVersion.projections.length > 0) {
      projectedProgram = context.program = projectProgram(
        context.originalProgram,
        projectedVersion.projections,
      );
    }
    projectedService = projectedProgram
      ? (projectedProgram.projector.projectedTypes.get(client.service) as Namespace)
      : client.service;
    context.__service_projection.set(client.service, [projectedService, projectedProgram]);
  }

  if (client.service !== client.type) {
    client.type = projectedProgram
      ? (projectedProgram.projector.projectedTypes.get(client.type) as Interface)
      : client.type;
  } else {
    client.type = projectedService;
  }
  client.service = projectedService;
}

function getClientsWithVersioning(context: TCGCContext, clients: SdkClient[]): SdkClient[] {
  if (context.apiVersion !== "all") {
    const projectedClients = [];
    for (const client of clients) {
      const projectedClient = { ...client };
      serviceVersioningProjection(context, projectedClient);
      // filter client not existed in the current version
      if ((projectedClient.type as Type).kind !== "Intrinsic") {
        projectedClients.push(projectedClient);
      }
    }
    return projectedClients;
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
    context.__rawClients = getClientsWithVersioning(context, explicitClients);
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

  context.__rawClients = getClientsWithVersioning(context, clients);
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
      // Skip templated operations
      if (!isTemplateDeclarationOrInstance(op)) {
        operations.push(getOverriddenClientMethod(context, op) ?? op);
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

export function createTCGCContext(program: Program, emitterName: string): TCGCContext {
  const diagnostics = createDiagnosticCollector();
  return {
    program,
    emitterName: diagnostics.pipe(parseEmitterName(program, emitterName)),
    diagnostics: diagnostics.diagnostics,
    originalProgram: program,
    __clientToParameters: new Map(),
    __tspTypeToApiVersions: new Map(),
    __clientToApiVersionClientDefaultValue: new Map(),
    previewStringRegex: /-preview$/,
  };
}

interface VersioningStrategy {
  readonly strategy?: "ignore";
  readonly previewStringRegex?: RegExp; // regex to match preview versions
}

export interface CreateSdkContextOptions {
  readonly versioning?: VersioningStrategy;
  additionalDecorators?: string[];
}

export async function createSdkContext<
  TOptions extends Record<string, any> = SdkEmitterOptions,
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
>(
  context: EmitContext<TOptions>,
  emitterName?: string,
  options?: CreateSdkContextOptions,
): Promise<SdkContext<TOptions, TServiceOperation>> {
  const diagnostics = createDiagnosticCollector();
  const protocolOptions = true; // context.program.getLibraryOptions("generate-protocol-methods");
  const convenienceOptions = true; // context.program.getLibraryOptions("generate-convenience-methods");
  const generateProtocolMethods = context.options["generate-protocol-methods"] ?? protocolOptions;
  const generateConvenienceMethods =
    context.options["generate-convenience-methods"] ?? convenienceOptions;
  const tcgcContext = createTCGCContext(
    context.program,
    (emitterName ?? context.program.emitters[0]?.metadata?.name)!,
  );
  const sdkContext: SdkContext<TOptions, TServiceOperation> = {
    ...tcgcContext,
    emitContext: context,
    sdkPackage: undefined!,
    generateProtocolMethods: generateProtocolMethods,
    generateConvenienceMethods: generateConvenienceMethods,
    packageName: context.options["package-name"],
    flattenUnionAsEnum: context.options["flatten-union-as-enum"] ?? true,
    apiVersion: options?.versioning?.strategy === "ignore" ? "all" : context.options["api-version"],
    examplesDir: context.options["examples-dir"] ?? context.options["examples-directory"],
    decoratorsAllowList: [...defaultDecoratorsAllowList, ...(options?.additionalDecorators ?? [])],
    previewStringRegex: options?.versioning?.previewStringRegex || tcgcContext.previewStringRegex,
  };
  sdkContext.sdkPackage = diagnostics.pipe(getSdkPackage(sdkContext));
  for (const client of sdkContext.sdkPackage.clients) {
    diagnostics.pipe(await handleClientExamples(sdkContext, client));
  }
  sdkContext.diagnostics = sdkContext.diagnostics.concat(diagnostics.diagnostics);
  return sdkContext;
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
        let sourceProp = value;
        while (sourceProp.sourceProperty) {
          sourceProp = sourceProp.sourceProperty;
        }
        if (sourceProp.model && !isAzureCoreTspModel(sourceProp.model)) {
          params.push(value);
        } else if (!sourceProp.model) {
          params.push(value);
        } else {
          // eslint-disable-next-line no-console
          console.log(
            `We are not counting "${sourceProp.name}" as part of a method parameter because it's been added by Azure.Core templates`,
          );
        }
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

export const $useSystemTextJsonConverter: DecoratorFunction = (
  context: DecoratorContext,
  entity: Model,
  scope?: LanguageScopes,
) => {};

const clientInitializationKey = createStateSymbol("clientInitialization");

export const $clientInitialization: ClientInitializationDecorator = (
  context: DecoratorContext,
  target: Namespace | Interface,
  options: Model,
  scope?: LanguageScopes,
) => {
  setScopedDecoratorData(
    context,
    $clientInitialization,
    clientInitializationKey,
    target,
    options,
    scope,
  );
};

export function getClientInitialization(
  context: TCGCContext,
  entity: Namespace | Interface,
): SdkInitializationType | undefined {
  const model = getScopedDecoratorData(context, clientInitializationKey, entity);
  if (!model) return model;
  const sdkModel = getSdkModel(context, model);
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

const paramAliasKey = createStateSymbol("paramAlias");

export const paramAliasDecorator: ParamAliasDecorator = (
  context: DecoratorContext,
  original: ModelProperty,
  paramAlias: string,
  scope?: LanguageScopes,
) => {
  setScopedDecoratorData(context, paramAliasDecorator, paramAliasKey, original, paramAlias, scope);
};

export function getParamAlias(context: TCGCContext, original: ModelProperty): string | undefined {
  return getScopedDecoratorData(context, paramAliasKey, original);
}
