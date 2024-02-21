import {
  DecoratorContext,
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
  SyntaxKind,
  Type,
  Union,
  UsageFlags,
  getNamespaceFullName,
  getProjectedName,
  ignoreDiagnostics,
  isService,
  isTemplateDeclaration,
  isTemplateDeclarationOrInstance,
  listServices,
  validateDecoratorUniqueOnNode,
} from "@typespec/compiler";
import { isHeader } from "@typespec/http";
import {
  AccessFlags,
  LanguageScopes,
  SdkClient,
  SdkContext,
  SdkEmitterOptions,
  SdkHttpOperation,
  SdkOperationGroup,
  SdkServiceOperation,
} from "./interfaces.js";
import { parseEmitterName } from "./internal-utils.js";
import { createStateSymbol, reportDiagnostic } from "./lib.js";
import { getSdkPackage } from "./package.js";
import { getAllModels, getSdkEnum, getSdkModel } from "./types.js";

export const namespace = "Azure.ClientGenerator.Core";
const AllScopes = Symbol.for("@azure-core/typespec-client-generator-core/all-scopes");

function getScopedDecoratorData<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>,
  key: symbol,
  target: Type
): any {
  const retval: Record<string | symbol, any> = context.program.stateMap(key).get(target);
  if (retval === undefined) return retval;
  if (Object.keys(retval).includes(context.emitterName)) return retval[context.emitterName];
  return retval[AllScopes]; // in this case it applies to all languages
}

function listScopedDecoratorData<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>,
  key: symbol
): any[] {
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
  transitivity: boolean = false
): boolean {
  const targetEntry = context.program.stateMap(key).get(target);
  // If target doesn't exist in decorator map, create a new entry
  if (!targetEntry) {
    // value is going to be a list of tuples, each tuple is a value and a list of scopes
    context.program.stateMap(key).set(target, { [scope ?? AllScopes]: value });
    return true;
  }

  // If target exists, but there's a specified scope and it doesn't exist in the target entry, add mapping of scope and value to target entry
  const scopes = Reflect.ownKeys(targetEntry);
  if (!scopes.includes(AllScopes) && scope && !scopes.includes(scope)) {
    targetEntry[scope] = value;
    return true;
  }
  if (!transitivity) {
    validateDecoratorUniqueOnNode(context, target, decorator);
    return false;
  }
  if (!Reflect.ownKeys(targetEntry).includes(AllScopes) && !scope) {
    context.program.stateMap(key).set(target, { AllScopes: value });
  }
  return false;
}

const clientKey = createStateSymbol("client");

function isArm(service: Namespace): boolean {
  return service.decorators.some(
    (decorator) => decorator.decorator.name === "$armProviderNamespace"
  );
}

export function $client(
  context: DecoratorContext,
  target: Namespace | Interface,
  options?: Model,
  scope?: LanguageScopes
) {
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
      : findClientService(context.program, target) ?? (target as any);
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
    arm: isArm(service),
    crossLanguageDefinitionId: `${getNamespaceFullName(service)}.${name}`,
  };
  setScopedDecoratorData(context, $client, clientKey, target, client, scope);
}

function findClientService(
  program: Program,
  client: Namespace | Interface
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

/**
 * Return the client object for the given namespace or interface, or undefined if the given namespace or interface is not a client.
 *
 * @param context SdkContext
 * @param type Type to check
 * @returns Client or undefined
 */
export function getClient<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>,
  type: Namespace | Interface
): SdkClient | undefined {
  if (hasExplicitClientOrOperationGroup(context)) {
    return getScopedDecoratorData(context, clientKey, type);
  }

  // if there is no explicit client or operation group,
  // we need to find whether current namespace is an implicit client (namespace with @service decorator)
  if (type.kind === "Namespace") {
    for (const client of listClients(context)) {
      if (client.type === type) {
        return client;
      }
    }
  }

  return undefined;
}

function hasExplicitClientOrOperationGroup<
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
>(context: SdkContext<TServiceOperation>): boolean {
  return (
    listScopedDecoratorData(context, clientKey).length > 0 ||
    listScopedDecoratorData(context, operationGroupKey).length > 0
  );
}

/**
 * List all the clients.
 *
 * @param context SdkContext
 * @returns Array of clients
 */
export function listClients<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>
): SdkClient[] {
  const explicitClients = [...listScopedDecoratorData(context, clientKey)];
  if (explicitClients.length > 0) {
    return explicitClients;
  }

  // if there is no explicit client, we will treat namespaces with service decorator as clients
  const services = listServices(context.program);

  return services.map((service) => {
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
      arm: isArm(service.type),
      crossLanguageDefinitionId: `${getNamespaceFullName(service.type)}.${clientName}`,
    };
  });
}

const operationGroupKey = createStateSymbol("operationGroup");
export function $operationGroup(
  context: DecoratorContext,
  target: Namespace | Interface,
  scope?: LanguageScopes
) {
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
    scope
  );
}

/**
 * Check a namespace or interface is an operation group.
 * @param context SdkContext
 * @param type Type to check
 * @returns boolean
 */
export function isOperationGroup<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>,
  type: Namespace | Interface
): boolean {
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
 * @param context SdkContext
 * @param type Type to check
 * @returns boolean
 */
export function isInOperationGroup<
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
>(context: SdkContext<TServiceOperation>, type: Namespace | Interface | Operation): boolean {
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

function buildOperationGroupPath<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>,
  type: Namespace | Interface
): string {
  const path = [];
  while (true) {
    const client = getClient(context, type);
    if (client) {
      path.push(client.name);
      break;
    }
    if (isOperationGroup(context, type)) {
      path.push(type.name);
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
 * @param context SdkContext
 * @param type Type to check
 * @returns Operation group or undefined.
 */
export function getOperationGroup<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>,
  type: Namespace | Interface
): SdkOperationGroup | undefined {
  let operationGroup: SdkOperationGroup | undefined;

  if (hasExplicitClientOrOperationGroup(context)) {
    operationGroup = getScopedDecoratorData(context, operationGroupKey, type);
    if (operationGroup) {
      operationGroup.groupPath = buildOperationGroupPath(context, type);
    }
  } else {
    // if there is no explicit client, we will treat non-client namespaces and all interfaces as operation group
    if (type.kind === "Interface" && !isTemplateDeclaration(type)) {
      operationGroup = {
        kind: "SdkOperationGroup",
        type,
        groupPath: buildOperationGroupPath(context, type),
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
 * @param context SdkContext
 * @param group Client or operation group to list operation groups
 * @param ignoreHierarchy Whether to get all nested operation groups
 * @returns
 */
export function listOperationGroups<
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
>(
  context: SdkContext<TServiceOperation>,
  group: SdkClient | SdkOperationGroup,
  ignoreHierarchy = false
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
 * @param program SdkContext
 * @param group Client or operation group to list operations
 * @param ignoreHierarchy Whether to get all nested operations
 * @returns
 */
export function listOperationsInOperationGroup<
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
>(
  context: SdkContext<TServiceOperation>,
  group: SdkOperationGroup | SdkClient,
  ignoreHierarchy = false
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

export function createSdkContext<
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
  TOptions extends Record<string, any> = SdkEmitterOptions,
>(context: EmitContext<TOptions>, emitterName?: string): SdkContext<TServiceOperation, TOptions> {
  const protocolOptions = true; // context.program.getLibraryOptions("generate-protocol-methods");
  const convenienceOptions = true; // context.program.getLibraryOptions("generate-convenience-methods");
  const generateProtocolMethods = context.options["generate-protocol-methods"] ?? protocolOptions;
  const generateConvenienceMethods =
    context.options["generate-convenience-methods"] ?? convenienceOptions;
  const sdkContext: SdkContext<TServiceOperation, TOptions> = {
    program: context.program,
    emitContext: context,
    sdkPackage: undefined!,
    emitterName: parseEmitterName(emitterName ?? context.program.emitters[0]?.metadata?.name), // eslint-disable-line deprecation/deprecation
    generateProtocolMethods: generateProtocolMethods,
    generateConvenienceMethods: generateConvenienceMethods,
    filterOutCoreModels: context.options["filter-out-core-models"] ?? true,
    packageName: context.options["package-name"],
  };
  sdkContext.sdkPackage = getSdkPackage(sdkContext);
  return sdkContext;
}

const protocolAPIKey = createStateSymbol("protocolAPI");

export function $protocolAPI(
  context: DecoratorContext,
  entity: Operation,
  value: boolean,
  scope?: LanguageScopes
) {
  setScopedDecoratorData(context, $protocolAPI, protocolAPIKey, entity, value, scope);
}

const convenientAPIKey = createStateSymbol("convenientAPI");

export function $convenientAPI(
  context: DecoratorContext,
  entity: Operation,
  value: boolean,
  scope?: LanguageScopes
) {
  setScopedDecoratorData(context, $convenientAPI, convenientAPIKey, entity, value, scope);
}

export function shouldGenerateProtocol<
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
>(context: SdkContext<TServiceOperation>, entity: Operation): boolean {
  const value = getScopedDecoratorData(context, protocolAPIKey, entity);
  return value ?? context.generateProtocolMethods;
}

export function shouldGenerateConvenient<
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
>(context: SdkContext<TServiceOperation>, entity: Operation): boolean {
  const value = getScopedDecoratorData(context, convenientAPIKey, entity);
  return value ?? context.generateConvenienceMethods;
}

const excludeKey = createStateSymbol("exclude");

/**
 * @deprecated Use `usage` and `access` decorator instead.
 */
export function $exclude(context: DecoratorContext, entity: Model, scope?: LanguageScopes) {
  setScopedDecoratorData(context, $exclude, excludeKey, entity, true, scope); // eslint-disable-line deprecation/deprecation
}

const includeKey = createStateSymbol("include");

/**
 * @deprecated Use `usage` and `access` decorator instead.
 */
export function $include(context: DecoratorContext, entity: Model, scope?: LanguageScopes) {
  modelTransitiveSet(context, $include, includeKey, entity, true, scope); // eslint-disable-line deprecation/deprecation
}

/**
 * @deprecated This function is unused and will be removed in a future release.
 */
export function isExclude<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>,
  entity: Model
): boolean {
  return getScopedDecoratorData(context, excludeKey, entity) ?? false;
}

/**
 * @deprecated This function is unused and will be removed in a future release.
 */
export function isInclude<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>,
  entity: Model
): boolean {
  return getScopedDecoratorData(context, includeKey, entity) ?? false;
}

function modelTransitiveSet(
  context: DecoratorContext,
  decorator: DecoratorFunction,
  key: symbol,
  entity: Model,
  value: unknown,
  scope?: LanguageScopes,
  transitivity: boolean = false
) {
  if (!setScopedDecoratorData(context, decorator, key, entity, value, scope, transitivity)) {
    return;
  }

  if (entity.baseModel) {
    modelTransitiveSet(context, decorator, key, entity.baseModel, value, scope, true);
  }

  entity.properties.forEach((p) => {
    if (p.kind === "ModelProperty" && p.type.kind === "Model") {
      modelTransitiveSet(context, decorator, key, p.type, value, scope, true);
    }
  });
}

const clientFormatKey = createStateSymbol("clientFormat");
const allowedClientFormatToTargetTypeMap: Record<ClientFormat, string[]> = {
  unixtime: ["int32", "int64"],
  iso8601: ["utcDateTime", "offsetDateTime", "duration"],
  rfc1123: ["utcDateTime", "offsetDateTime"],
  seconds: ["duration"],
};

export type ClientFormat = "unixtime" | "iso8601" | "rfc1123" | "seconds";

/**
 * @deprecated Use `encode` decorator in `@typespec/core` instead.
 */
export function $clientFormat(
  context: DecoratorContext,
  target: ModelProperty,
  format: ClientFormat,
  scope?: LanguageScopes
) {
  const expectedTargetTypes = allowedClientFormatToTargetTypeMap[format];
  if (
    context.program.checker.isStdType(target.type) &&
    expectedTargetTypes.includes(target.type.name)
  ) {
    setScopedDecoratorData(context, $clientFormat, clientFormatKey, target, format, scope); // eslint-disable-line deprecation/deprecation
  } else {
    reportDiagnostic(context.program, {
      code: "incorrect-client-format",
      format: { format, expectedTargetTypes: expectedTargetTypes.join('", "') },
      target: context.decoratorTarget,
    });
  }
}

/**
 * Gets additional information on how to serialize / deserialize TYPESPEC standard types depending
 * on whether additional serialization information is provided or needed
 *
 * @param context the Sdk Context
 * @param entity the entity whose client format we are going to get
 * @returns the format in which to serialize the typespec type or undefined
 * @deprecated This function is unused and will be removed in a future release.
 */
export function getClientFormat<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>,
  entity: ModelProperty
): ClientFormat | undefined {
  let retval: ClientFormat | undefined = getScopedDecoratorData(context, clientFormatKey, entity);
  if (retval === undefined && context.program.checker.isStdType(entity.type)) {
    if (entity.type.name === "utcDateTime" || entity.type.name === "offsetDateTime") {
      // if it's a date-time we have the following defaults
      retval = isHeader(context.program, entity) ? "rfc1123" : "iso8601";
      context.program.stateMap(clientFormatKey).set(entity, retval);
    } else if (entity.type.name === "duration") {
      retval = "iso8601";
    }
  }

  return retval;
}
const internalKey = createStateSymbol("internal");

/**
 * Whether a operation is internal and should not be exposed
 * to end customers
 *
 * @param context DecoratorContext
 * @param target Operation to mark as internal
 * @param scope Names of the projection (e.g. "python", "csharp", "java", "javascript")
 * @deprecated Use `access` decorator instead.
 */
export function $internal(context: DecoratorContext, target: Operation, scope?: LanguageScopes) {
  setScopedDecoratorData(context, $internal, internalKey, target, true, scope); // eslint-disable-line deprecation/deprecation
}

/**
 * Whether a model / operation is internal or not. If it's internal, emitters
 * should not expose them to users
 *
 * @param context SdkContext
 * @param entity model / operation that we want to check is internal or not
 * @returns whether the entity is internal
 * @deprecated This function is unused and will be removed in a future release.
 */
export function isInternal<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>,
  entity: Model | Operation | Enum | Union
): boolean {
  const found = getScopedDecoratorData(context, internalKey, entity) ?? false;
  if (entity.kind === "Operation" || found) {
    return found;
  }
  if (!context.operationModelsMap) {
    getAllModels(context); // this will populate operationModelsMap
  }
  const operationModels = context.operationModelsMap!;
  let referredByInternal = false;
  for (const [operation, modelMap] of operationModels) {
    // eslint-disable-next-line deprecation/deprecation
    if (isInternal(context, operation) && modelMap.get(entity)) {
      referredByInternal = true;
      // eslint-disable-next-line deprecation/deprecation
    } else if (!isInternal(context, operation) && modelMap.get(entity)) {
      return false;
    }
  }
  return referredByInternal;
}

const usageKey = createStateSymbol("usage");

export function $usage(
  context: DecoratorContext,
  entity: Model | Enum,
  value: EnumMember | Union,
  scope?: LanguageScopes
) {
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
}

export function getUsageOverride<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>,
  entity: Model | Enum
): UsageFlags | undefined {
  return getScopedDecoratorData(context, usageKey, entity);
}

export function getUsage<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>,
  entity: Model | Enum
): UsageFlags {
  if (!context.modelsMap) {
    getAllModels(context); // this will populate modelsMap
  }
  return entity.kind === "Model"
    ? ignoreDiagnostics(getSdkModel(context, entity)).usage
    : getSdkEnum(context, entity).usage;
}

const accessKey = createStateSymbol("access");

export function $access(
  context: DecoratorContext,
  entity: Model | Enum | Operation,
  value: EnumMember,
  scope?: LanguageScopes
) {
  if (typeof value.value !== "string" || (value.value !== "public" && value.value !== "internal")) {
    reportDiagnostic(context.program, {
      code: "access",
      format: {},
      target: entity,
    });
  }
  setScopedDecoratorData(context, $access, accessKey, entity, value.value, scope);
}

export function getAccessOverride<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>,
  entity: Model | Enum | Operation
): AccessFlags | undefined {
  return getScopedDecoratorData(context, accessKey, entity);
}

export function getAccess<TServiceOperation extends SdkServiceOperation = SdkHttpOperation>(
  context: SdkContext<TServiceOperation>,
  entity: Model | Enum | Operation
): AccessFlags | undefined {
  const override = getScopedDecoratorData(context, accessKey, entity);
  if (override || entity.kind === "Operation") {
    return override;
  }

  if (!context.operationModelsMap) {
    getAllModels(context); // this will populate operationModelsMap
  }

  return entity.kind === "Model"
    ? ignoreDiagnostics(getSdkModel(context, entity)).access
    : getSdkEnum(context, entity).access;
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
export function $flattenProperty(
  context: DecoratorContext,
  target: ModelProperty,
  scope?: LanguageScopes
) {
  setScopedDecoratorData(context, $flattenProperty, flattenPropertyKey, target, true, scope); // eslint-disable-line deprecation/deprecation
}

/**
 * Whether a model property should be flattened or not.
 *
 * @param context SdkContext
 * @param target ModelProperty that we want to check whether it should be flattened or not
 * @returns whether the model property should be flattened or not
 */
export function shouldFlattenProperty(context: SdkContext, target: ModelProperty): boolean {
  return getScopedDecoratorData(context, flattenPropertyKey, target) ?? false;
}

const clientNameKey = createStateSymbol("clientName");

export function $clientName(
  context: DecoratorContext,
  entity: Type,
  value: string,
  scope?: LanguageScopes
) {
  setScopedDecoratorData(context, $clientName, clientNameKey, entity, value, scope);
}

export function getClientNameOverride(context: SdkContext, entity: Type): string | undefined {
  return getScopedDecoratorData(context, clientNameKey, entity);
}
