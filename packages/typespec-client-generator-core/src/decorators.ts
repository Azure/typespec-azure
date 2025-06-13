import {
  DecoratorContext,
  DecoratorFunction,
  Enum,
  EnumMember,
  Interface,
  Model,
  ModelProperty,
  Namespace,
  Operation,
  Program,
  RekeyableMap,
  Scalar,
  Type,
  Union,
  getDiscriminator,
  getNamespaceFullName,
  ignoreDiagnostics,
  isService,
  isTemplateDeclaration,
} from "@typespec/compiler";
import { SyntaxKind, type Node } from "@typespec/compiler/ast";
import {
  AccessDecorator,
  AlternateTypeDecorator,
  ApiVersionDecorator,
  ClientApiVersionsDecorator,
  ClientDecorator,
  ClientDocDecorator,
  ClientInitializationDecorator,
  ClientNameDecorator,
  ClientNamespaceDecorator,
  ConvenientAPIDecorator,
  DeserializeEmptyStringAsNullDecorator,
  FlattenPropertyDecorator,
  OperationGroupDecorator,
  ParamAliasDecorator,
  ProtocolAPIDecorator,
  ResponseAsBoolDecorator,
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
  clientKey,
  clientLocationKey,
  clientNameKey,
  clientNamespaceKey,
  compareModelProperties,
  findRootSourceProperty,
  getScopedDecoratorData,
  hasExplicitClientOrOperationGroup,
  listAllUserDefinedNamespaces,
  negationScopesKey,
  omitOperation,
  operationGroupKey,
  scopeKey,
} from "./internal-utils.js";
import { createStateSymbol, reportDiagnostic } from "./lib.js";
import { getSdkEnum, getSdkModel, getSdkUnion } from "./types.js";

export const namespace = "Azure.ClientGenerator.Core";

function setScopedDecoratorData(
  context: DecoratorContext,
  decorator: DecoratorFunction,
  key: symbol,
  target: Type,
  value: unknown,
  scope?: LanguageScopes,
) {
  const targetEntry = context.program.stateMap(key).get(target);
  // if no scope specified, then set with the new value
  if (!scope) {
    if (targetEntry && targetEntry[AllScopes]) {
      targetEntry[AllScopes] = value;
    } else {
      const newObject = Object.fromEntries([[AllScopes, value]]);
      context.program
        .stateMap(key)
        .set(target, !targetEntry ? newObject : { ...targetEntry, ...newObject });
    }
    return;
  }

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
    subOperationGroups: [],
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

/**
 * List all the clients.
 *
 * @param context TCGCContext
 * @returns Array of clients
 */
export function listClients(context: TCGCContext): SdkClient[] {
  return context.getClients();
}

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
 * Return the operation group object for the given namespace or interface or undefined is not an operation group.
 * @param context TCGCContext
 * @param type Type to check
 * @returns Operation group or undefined.
 */
export function getOperationGroup(
  context: TCGCContext,
  type: Namespace | Interface,
): SdkOperationGroup | undefined {
  const operationGroup = context.getClientOrOperationGroup(type);

  return operationGroup?.kind === "SdkOperationGroup" ? operationGroup : undefined;
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
  if (!ignoreHierarchy) return group.subOperationGroups;

  const groups: SdkOperationGroup[] = [...group.subOperationGroups];
  let current = 0;
  while (current < groups.length) {
    const operationGroup = groups[current];
    if (operationGroup.subOperationGroups) {
      groups.push(...operationGroup.subOperationGroups);
    }
    current++;
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
  if (!ignoreHierarchy) return context.getOperationsForClient(group);

  const groups: SdkOperationGroup[] = [...group.subOperationGroups];
  const operations: Operation[] = [...context.getOperationsForClient(group)];
  while (groups.length > 0) {
    const operationGroup = groups.shift()!;
    if (operationGroup.subOperationGroups) {
      groups.push(...operationGroup.subOperationGroups);
    }
    operations.push(...context.getOperationsForClient(operationGroup));
  }

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
  entity: Model | Enum | Operation | Union | Namespace | ModelProperty,
  value: EnumMember,
  scope?: LanguageScopes,
) => {
  if (typeof value.value !== "string" || (value.value !== "public" && value.value !== "internal")) {
    reportDiagnostic(context.program, {
      code: "invalid-access",
      format: {},
      target: entity,
    });
    return;
  }
  setScopedDecoratorData(context, $access, accessKey, entity, value.value, scope);
};

export function getAccessOverride(
  context: TCGCContext,
  entity: Model | Enum | Operation | Union | Namespace | ModelProperty,
): AccessFlags | undefined {
  const accessOverride = getScopedDecoratorData(context, accessKey, entity);

  if (!accessOverride && entity.kind !== "ModelProperty" && entity.namespace) {
    return getAccessOverride(context, entity.namespace);
  }

  return accessOverride;
}

export function getAccess(
  context: TCGCContext,
  entity: Model | Enum | Operation | Union | ModelProperty,
) {
  const override = getAccessOverride(context, entity);
  if (override || entity.kind === "Operation" || entity.kind === "ModelProperty") {
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
    const target = context.decoratorTarget as Node;
    if (target.kind === SyntaxKind.AugmentDecoratorStatement) {
      if (
        (
          ignoreDiagnostics(
            (context.program.checker as any).resolveTypeReference(target.targetType),
          ) as any
        )?.node !== entity.node
      ) {
        return;
      }
    }
    if (target.kind === SyntaxKind.DecoratorExpression) {
      if (target.parent !== entity.node) {
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

// Recursive function to collect parameter names
function collectParams(
  properties: RekeyableMap<string, ModelProperty>,
  params: ModelProperty[] = [],
): ModelProperty[] {
  properties.forEach((value, key) => {
    // If the property is of type 'model', recurse into its properties
    if (params.filter((x) => compareModelProperties(undefined, x, value)).length === 0) {
      if (value.type.kind === "Model") {
        collectParams(value.type.properties, params);
      } else {
        params.push(findRootSourceProperty(value));
      }
    }
  });

  return params;
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

  // Check if the sorted parameter names arrays are equal, omit optional parameters
  let parametersMatch = true;
  let index = 0;
  for (const originalParam of originalParams) {
    if (index > overrideParams.length - 1) {
      if (!originalParam.optional) {
        parametersMatch = false;
        break;
      } else {
        continue;
      }
    }
    if (!compareModelProperties(undefined, originalParam, overrideParams[index])) {
      if (!originalParam.optional) {
        parametersMatch = false;
        break;
      } else {
        continue;
      }
    }
    index++;
  }

  if (!parametersMatch) {
    reportDiagnostic(context.program, {
      code: "override-parameters-mismatch",
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
  alternate: Type,
  scope?: LanguageScopes,
) => {
  if (source.kind === "Scalar" && alternate.kind !== "Scalar") {
    reportDiagnostic(context.program, {
      code: "invalid-alternate-type",
      format: {
        kindName: alternate.kind,
      },
      target: alternate,
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
  const paramAliasDec = context.program.stateMap(paramAliasKey).get(original);
  const paramAliasVal = paramAliasDec?.[scope || AllScopes] ?? paramAliasDec?.[AllScopes];
  if (paramAliasVal) {
    reportDiagnostic(context.program, {
      code: "multiple-param-alias",
      format: {
        originalName: original.name,
        firstParamAlias: paramAliasVal,
      },
      target: context.decoratorTarget,
    });
    return;
  }
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

/**
 * Find the shortest namespace that overlaps with the override string.
 * @param override
 * @param userDefinedNamespaces
 * @returns
 */
function findNamespaceOverlapClosestToRoot(
  override: string,
  userDefinedNamespaces: Namespace[],
): Namespace | undefined {
  for (const namespace of userDefinedNamespaces) {
    if (override.includes(namespace.name)) {
      return namespace;
    }
  }

  return undefined;
}

/**
 * Returns the client namespace for a given entity. The order of operations is as follows:
 *
 * 1. If `@clientNamespace` is applied to the entity, this wins out.
 *    a. If the `--namespace` flag is passed in during generation, we will replace the root of the client namespace with the flag.
 * 2. If the `--namespace` flag is passed in, we treat that as the only namespace in the entire spec, and return that namespace.
 * 3. We return the namespace of the entity retrieved from the original spec.
 * @param context
 * @param entity
 * @returns
 */
export function getClientNamespace(
  context: TCGCContext,
  entity: Namespace | Interface | Model | Enum | Union,
): string {
  const override = getScopedDecoratorData(context, clientNamespaceKey, entity);
  if (override) {
    // if `@clientNamespace` is applied to the entity, this wins out
    const userDefinedNamespace = findNamespaceOverlapClosestToRoot(
      override,
      listAllUserDefinedNamespaces(context),
    );
    if (userDefinedNamespace && context.namespaceFlag) {
      // we still make sure to replace the root of the client namespace with the flag (if the flag exists)
      return override.replace(userDefinedNamespace.name, context.namespaceFlag);
    }
    return override;
  }
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
  let isOverridden: boolean = false;
  while (current && current.name !== "") {
    const override = getScopedDecoratorData(context, clientNamespaceKey, current);
    if (override) {
      segments.unshift(override);
      isOverridden = true;
      break;
    }
    segments.unshift(current.name);
    current = current.namespace;
  }
  const joinedSegments = segments.join(".");
  if (isOverridden) {
    // if it's overridden, and there's a `@clientNamespace` flag, we want to do the shortest namespace overlap replacement
    const userDefinedNamespace = findNamespaceOverlapClosestToRoot(
      joinedSegments,
      listAllUserDefinedNamespaces(context),
    );
    if (userDefinedNamespace && context.namespaceFlag) {
      return joinedSegments.replace(userDefinedNamespace.name, context.namespaceFlag);
    }
    return joinedSegments;
  }
  if (context.namespaceFlag) return context.namespaceFlag;
  return joinedSegments;
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

const clientApiVersionsKey = createStateSymbol("clientApiVersions");

/**
 * Add additional api versions that are possible for the client to use.
 *
 * @param context
 * @param target Service namespace that has these additional api versions
 * @param value Enum with the additional api versions
 * @param scope
 */
export const $clientApiVersions: ClientApiVersionsDecorator = (
  context: DecoratorContext,
  target: Namespace,
  value: Enum,
  scope?: LanguageScopes,
) => {
  setScopedDecoratorData(context, $clientApiVersions, clientApiVersionsKey, target, value, scope);
};

/**
 * Get the explicit client api versions that are possible for the client to use denoted by `@clientApiVersions`
 *
 * @param context
 * @param target
 * @returns
 */
export function getExplicitClientApiVersions(
  context: TCGCContext,
  target: Namespace,
): Enum | undefined {
  return getScopedDecoratorData(context, clientApiVersionsKey, target);
}
export const $deserializeEmptyStringAsNull: DeserializeEmptyStringAsNullDecorator = (
  context: DecoratorContext,
  target: ModelProperty,
  scope?: LanguageScopes,
) => {
  if (target.type.kind !== "Scalar") {
    reportDiagnostic(context.program, {
      code: "invalid-deserializeEmptyStringAsNull-target-type",
      format: {},
      target: target,
    });
    return;
  }

  if (target.type.name !== "string") {
    let scalarType = target.type as Scalar;
    while (scalarType.baseScalar !== undefined) {
      scalarType = scalarType.baseScalar;
    }

    if (scalarType.name !== "string") {
      reportDiagnostic(context.program, {
        code: "invalid-deserializeEmptyStringAsNull-target-type",
        format: {},
        target: target,
      });
      return;
    }
  }
};

const responseAsBoolKey = createStateSymbol("responseAsBool");

export const $responseAsBool: ResponseAsBoolDecorator = (
  context: DecoratorContext,
  target: Operation,
  scope?: LanguageScopes,
) => {
  if (!target.decorators.some((d) => d.definition?.name === "@head")) {
    reportDiagnostic(context.program, {
      code: "non-head-bool-response-decorator",
      format: {
        operationName: target.name,
      },
      target: target,
    });
    return;
  }
  setScopedDecoratorData(context, $responseAsBool, responseAsBoolKey, target, true, scope);
};

export function getResponseAsBool(context: TCGCContext, target: Operation): boolean {
  return getScopedDecoratorData(context, responseAsBoolKey, target);
}

const clientDocKey = createStateSymbol("clientDoc");

/**
 * Type representing the client documentation data stored.
 */
interface ClientDocData {
  documentation: string;
  mode: string;
}

export const $clientDoc: ClientDocDecorator = (
  context: DecoratorContext,
  target: Type,
  documentation: string,
  mode: EnumMember,
  scope?: LanguageScopes,
) => {
  const docMode = mode.value as string;
  // Validate the mode value
  if (docMode !== "append" && docMode !== "replace") {
    reportDiagnostic(context.program, {
      code: "invalid-client-doc-mode",
      format: { mode: docMode },
      target: context.decoratorTarget,
    });
    return;
  }

  const docData: ClientDocData = {
    documentation,
    mode: docMode,
  };

  setScopedDecoratorData(context, $clientDoc, clientDocKey, target, docData, scope);
};

/**
 * Gets the client documentation data for a type.
 *
 * @param context TCGCContext
 * @param target Type to get client documentation for
 * @returns ClientDocData or undefined if no client documentation exists
 */
export function getClientDocExplicit(
  context: TCGCContext,
  target: Type,
): ClientDocData | undefined {
  return getScopedDecoratorData(context, clientDocKey, target);
}

export const $clientLocation = (
  context: DecoratorContext,
  source: Operation,
  target: Interface | Namespace | string,
  scope?: LanguageScopes,
) => {
  setScopedDecoratorData(context, $clientLocation, clientLocationKey, source, target, scope);
};

/**
 * Gets the `Namespace`, `Interface` or name of client where an operation change the location to.
 *
 * @param context TCGCContext
 * @param operation Operation to be moved
 * @returns `Namespace`, `Interface`, `string` target or undefined if no location change.
 */
export function getClientLocation(
  context: TCGCContext,
  operation: Operation,
): Namespace | Interface | string | undefined {
  // if there is `@client` or `@operationGroup` decorator, `@clientLocation` will be ignored
  if (hasExplicitClientOrOperationGroup(context)) {
    return undefined;
  }
  return getScopedDecoratorData(context, clientLocationKey, operation) as
    | Namespace
    | Interface
    | string
    | undefined;
}

/**
 * Check if an operation is in scope for the current emitter.
 * @param context TCGCContext
 * @param entity Operation to check if it is in scope
 * @returns
 */
export function isInScope(context: TCGCContext, entity: Operation): boolean {
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
