import {
  BooleanLiteral,
  compilerAssert,
  createDiagnosticCollector,
  Diagnostic,
  getDeprecationDetails,
  getDoc,
  getLifecycleVisibilityEnum,
  getNamespaceFullName,
  getVisibilityForClass,
  ignoreDiagnostics,
  isNeverType,
  isNullType,
  isVoidType,
  listServices,
  Model,
  ModelProperty,
  Namespace,
  Numeric,
  NumericLiteral,
  Operation,
  Program,
  StringLiteral,
  Type,
  Union,
  Value,
} from "@typespec/compiler";
import {
  unsafe_mutateSubgraphWithNamespace,
  unsafe_MutatorWithNamespace,
} from "@typespec/compiler/experimental";
import { $ } from "@typespec/compiler/typekit";
import { HttpOperation, HttpOperationResponseContent, HttpPayloadBody } from "@typespec/http";
import {
  getAddedOnVersions,
  getRemovedOnVersions,
  getVersioningMutators,
  getVersions,
} from "@typespec/versioning";
import { getClientDocExplicit, getParamAlias } from "./decorators.js";
import {
  DecoratorInfo,
  SdkBuiltInType,
  SdkClient,
  SdkEnumType,
  SdkHttpResponse,
  SdkModelPropertyType,
  SdkOperationGroup,
  SdkType,
  TCGCContext,
} from "./interfaces.js";
import { createDiagnostic, createStateSymbol } from "./lib.js";
import {
  getCrossLanguageDefinitionId,
  getDefaultApiVersion,
  getHttpOperationWithCache,
  isApiVersion,
} from "./public-utils.js";
import { getClientTypeWithDiagnostics, getSdkModelPropertyType } from "./types.js";

export interface TCGCEmitterOptions extends BrandedSdkEmitterOptionsInterface {
  "emitter-name"?: string;
}

export interface UnbrandedSdkEmitterOptionsInterface {
  "generate-protocol-methods"?: boolean;
  "generate-convenience-methods"?: boolean;
  "api-version"?: string;
  license?: {
    name: string;
    company?: string;
    link?: string;
    header?: string;
    description?: string;
  };
}

export interface BrandedSdkEmitterOptionsInterface extends UnbrandedSdkEmitterOptionsInterface {
  "examples-dir"?: string;
  namespace?: string;
}

export const AllScopes = Symbol.for("@azure-core/typespec-client-generator-core/all-scopes");

export const clientNameKey = createStateSymbol("clientName");
export const clientNamespaceKey = createStateSymbol("clientNamespace");
export const negationScopesKey = createStateSymbol("negationScopes");
export const scopeKey = createStateSymbol("scope");
export const clientKey = createStateSymbol("client");
export const operationGroupKey = createStateSymbol("operationGroup");
export const clientLocationKey = createStateSymbol("clientLocation");
export const omitOperation = createStateSymbol("omitOperation");

export function hasExplicitClientOrOperationGroup(context: TCGCContext): boolean {
  return (
    listScopedDecoratorData(context, clientKey).length > 0 ||
    listScopedDecoratorData(context, operationGroupKey).length > 0
  );
}

export function listScopedDecoratorData(context: TCGCContext, key: symbol): any[] {
  const retval = [...context.program.stateMap(key).values()];
  return retval
    .filter((targetEntry) => {
      return targetEntry[context.emitterName] || targetEntry[AllScopes];
    })
    .flatMap((targetEntry) => targetEntry[context.emitterName] ?? targetEntry[AllScopes]);
}

export function getScopedDecoratorData(
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

/**
 *
 * @param emitterName Full emitter name
 * @returns The language of the emitter. I.e. "@azure-tools/typespec-csharp" will return "csharp"
 */
export function parseEmitterName(
  program: Program,
  emitterName?: string,
): [string, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  if (!emitterName) {
    diagnostics.add(
      createDiagnostic({
        code: "no-emitter-name",
        format: {},
        target: program.getGlobalNamespaceType(),
      }),
    );
    return diagnostics.wrap("none");
  }
  const regex = /(?:cadl|typespec|client|server)-([^\\/-]*)/;
  const match = emitterName.match(regex);
  if (!match || match.length < 2) return diagnostics.wrap("none");
  const language = match[1];
  if (["typescript", "ts"].includes(language)) return diagnostics.wrap("javascript");
  return diagnostics.wrap(language);
}

/**
 *
 * @param context
 * @param type The type that we are adding api version information onto
 * @returns Whether the type is the api version parameter and the default value for the client
 */
export function updateWithApiVersionInformation(
  context: TCGCContext,
  type: ModelProperty,
  client?: SdkClient | SdkOperationGroup,
): {
  isApiVersionParam: boolean;
  clientDefaultValue?: string;
} {
  const isApiVersionParam = isApiVersion(context, type);
  return {
    isApiVersionParam,
    clientDefaultValue:
      isApiVersionParam && client
        ? context.__clientApiVersionDefaultValueCache.get(client)
        : undefined,
  };
}

export function filterApiVersionsWithDecorators(
  context: TCGCContext,
  type: Type,
  apiVersions: string[],
): string[] {
  const addedOnVersions = getAddedOnVersions(context.program, type)?.map((x) => x.value) ?? [];
  const removedOnVersions = getRemovedOnVersions(context.program, type)?.map((x) => x.value) ?? [];
  let added: boolean = addedOnVersions.length ? false : true;
  let addedCounter = 0;
  let removeCounter = 0;
  const retval: string[] = [];
  for (let i = 0; i < apiVersions.length; i++) {
    const version = apiVersions[i];
    if (addedCounter < addedOnVersions.length && version === addedOnVersions[addedCounter]) {
      added = true;
      addedCounter++;
    }
    if (removeCounter < removedOnVersions.length && version === removedOnVersions[removeCounter]) {
      added = false;
      removeCounter++;
    }
    if (added) {
      // only add version smaller than config
      if (
        context.apiVersion === undefined ||
        context.apiVersion === "latest" ||
        context.apiVersion === "all" ||
        apiVersions.indexOf(context.apiVersion) >= i
      ) {
        retval.push(version);
      }
    }
  }
  return retval;
}

/**
 *
 * @param context
 * @param type
 * @param client If it's associated with a client, meaning it's a param etc, we can see if it's available on that client
 * @returns All api versions the type is available on
 */
export function getAvailableApiVersions(
  context: TCGCContext,
  type: Type,
  wrapper?: Type,
): string[] {
  let wrapperApiVersions: string[] = [];
  if (wrapper) {
    wrapperApiVersions = context.getApiVersionsForType(wrapper);
  }

  const allApiVersions =
    getVersions(context.program, type)[1]
      ?.getVersions()
      .map((x) => x.value) || [];

  const apiVersions = wrapperApiVersions.length ? wrapperApiVersions : allApiVersions;
  if (!apiVersions) return [];
  const explicitlyDecorated = filterApiVersionsWithDecorators(context, type, apiVersions);
  if (explicitlyDecorated.length) {
    context.setApiVersionsForType(type, explicitlyDecorated);
    return explicitlyDecorated;
  }
  context.setApiVersionsForType(type, wrapperApiVersions);
  return context.getApiVersionsForType(type);
}

/**
 *
 * @param type
 * @returns A unique id for each type so we can do set comparisons
 */
export function getHashForType(type: SdkType): string {
  if (type.kind === "array" || type.kind === "dict") {
    return `${type.kind}[${getHashForType(type.valueType)}]`;
  }
  if (type.kind === "enum" || type.kind === "model" || type.kind === "enumvalue") return type.name;
  if (type.kind === "union") {
    return type.variantTypes.map((x) => getHashForType(x)).join("|");
  }
  return type.kind;
}

interface DefaultSdkTypeBase<TKind> {
  __raw: Type;
  deprecation?: string;
  kind: TKind;
  decorators: DecoratorInfo[];
}

/**
 * Helper function to return default values for encode etc
 * @param type
 */
export function getSdkTypeBaseHelper<TKind>(
  context: TCGCContext,
  type: Type,
  kind: TKind,
): [DefaultSdkTypeBase<TKind>, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  return diagnostics.wrap({
    __raw: type,
    deprecation: getDeprecationDetails(context.program, type)?.message,
    kind,
    decorators: diagnostics.pipe(getTypeDecorators(context, type)),
  });
}

export function getNamespacePrefix(namespace: Namespace): string {
  return namespace ? getNamespaceFullName(namespace) + "." : "";
}

export function getTypeDecorators(
  context: TCGCContext,
  type: Type,
): [DecoratorInfo[], readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const retval: DecoratorInfo[] = [];
  if ("decorators" in type) {
    for (const decorator of type.decorators) {
      // only process explicitly defined decorators
      if (decorator.definition) {
        const decoratorName = `${getNamespacePrefix(decorator.definition?.namespace)}${decorator.definition?.name}`;
        // white list filtering
        if (
          !context.decoratorsAllowList ||
          !context.decoratorsAllowList.some((x) => new RegExp(x).test(decoratorName))
        ) {
          continue;
        }

        const decoratorInfo: DecoratorInfo = {
          name: decoratorName,
          arguments: {},
        };
        for (let i = 0; i < decorator.args.length; i++) {
          decoratorInfo.arguments[decorator.definition.parameters[i].name] = diagnostics.pipe(
            getDecoratorArgValue(context, decorator.args[i].jsValue, type, decoratorName),
          );
        }
        retval.push(decoratorInfo);
      }
    }
  }
  return diagnostics.wrap(retval);
}

function getDecoratorArgValue(
  context: TCGCContext,
  arg:
    | Type
    | Record<string, unknown>
    | Value
    | unknown[]
    | string
    | number
    | boolean
    | Numeric
    | null,
  type: Type,
  decoratorName: string,
): [any, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  if (typeof arg === "object" && arg !== null && "kind" in arg) {
    if (arg.kind === "EnumMember") {
      return diagnostics.wrap(diagnostics.pipe(getClientTypeWithDiagnostics(context, arg)));
    }
    if (arg.kind === "String" || arg.kind === "Number" || arg.kind === "Boolean") {
      return diagnostics.wrap(arg.value);
    }
    diagnostics.add(
      createDiagnostic({
        code: "unsupported-generic-decorator-arg-type",
        target: type,
        format: { decoratorName },
      }),
    );
    return diagnostics.wrap(undefined);
  }
  return diagnostics.wrap(arg);
}

export function intOrFloat(value: number): "int32" | "float32" {
  return value.toString().indexOf(".") === -1 ? "int32" : "float32";
}

/**
 * Whether a model or enum or union as enum is in Azure.Core[.Foundations] namespace
 * @param t
 * @returns
 */
export function isAzureCoreTspModel(t: Type): boolean {
  return (
    (t.kind === "Model" || t.kind === "Enum" || t.kind === "Union") &&
    t.namespace !== undefined &&
    ["Azure.Core", "Azure.Core.Foundations"].includes(getNamespaceFullName(t.namespace))
  );
}

export function isAcceptHeader(param: SdkModelPropertyType): boolean {
  return param.kind === "header" && param.serializedName.toLowerCase() === "accept";
}

export function isContentTypeHeader(param: SdkModelPropertyType): boolean {
  return param.kind === "header" && param.serializedName.toLowerCase() === "content-type";
}

export function isMultipartOperation(context: TCGCContext, operation?: Operation): boolean {
  if (!operation) return false;
  const httpOperation = getHttpOperationWithCache(context, operation);
  const httpBody = httpOperation.parameters.body;
  if (httpBody && httpBody.type.kind === "Model") {
    return httpBody.contentTypes.some((x) => x.startsWith("multipart/"));
  }
  return false;
}

export function isHttpOperation(context: TCGCContext, obj: any): obj is HttpOperation {
  return obj?.kind === "Operation" && getHttpOperationWithCache(context, obj) !== undefined;
}

export type TspLiteralType = StringLiteral | NumericLiteral | BooleanLiteral;

export function getNonNullOptions(type: Union): Type[] {
  return [...type.variants.values()].map((x) => x.type).filter((t) => !isNullType(t));
}

export function getNullOption(type: Union): Type | undefined {
  return [...type.variants.values()].map((x) => x.type).filter((t) => isNullType(t))[0];
}

export function getAllResponseBodiesAndNonBodyExists(responses: SdkHttpResponse[]): {
  allResponseBodies: SdkType[];
  nonBodyExists: boolean;
} {
  const allResponseBodies: SdkType[] = [];
  let nonBodyExists = false;
  for (const response of responses) {
    if (response.type) {
      allResponseBodies.push(response.type);
    } else {
      nonBodyExists = true;
    }
  }
  return { allResponseBodies, nonBodyExists };
}

export function getAllResponseBodies(responses: SdkHttpResponse[]): SdkType[] {
  return getAllResponseBodiesAndNonBodyExists(responses).allResponseBodies;
}

/**
 * Use this if you are trying to create a generated name for something without an original TypeSpec type.
 *
 * Otherwise, you should use the `getGeneratedName` function.
 * @param context
 */
export function createGeneratedName(
  context: TCGCContext,
  type: Namespace | Operation,
  suffix: string,
): string {
  return `${getCrossLanguageDefinitionId(context, type).split(".").at(-1)}${suffix}`;
}

export function isSubscriptionId(context: TCGCContext, parameter: { name: string }): boolean {
  return Boolean(context.arm) && parameter.name === "subscriptionId";
}

export function isNeverOrVoidType(type: Type): boolean {
  return isNeverType(type) || isVoidType(type);
}

export function getAnyType(
  context: TCGCContext,
  type: Type,
): [SdkBuiltInType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  return diagnostics.wrap({
    kind: "unknown",
    name: "unknown",
    encode: "string",
    crossLanguageDefinitionId: "",
    decorators: diagnostics.pipe(getTypeDecorators(context, type)),
  });
}

export function getHttpOperationResponseHeaders(
  response: HttpOperationResponseContent,
): ModelProperty[] {
  const headers: ModelProperty[] = response.headers ? Object.values(response.headers) : [];
  if (response.body?.contentTypeProperty) {
    headers.push(response.body.contentTypeProperty);
  }
  return headers;
}

export function removeVersionsLargerThanExplicitlySpecified(
  context: TCGCContext,
  versions: { value: string | number }[],
): void {
  // filter with specific api version
  if (
    context.apiVersion !== undefined &&
    context.apiVersion !== "latest" &&
    context.apiVersion !== "all"
  ) {
    const index = versions.findIndex((version) => version.value === context.apiVersion);
    if (index >= 0) {
      versions.splice(index + 1, versions.length - index - 1);
    }
  }
}

export function filterApiVersionsInEnum(
  context: TCGCContext,
  client: SdkClient,
  sdkVersionsEnum: SdkEnumType,
): void {
  // if they explicitly set an api version, remove larger versions
  removeVersionsLargerThanExplicitlySpecified(context, sdkVersionsEnum.values);
  const defaultApiVersion = getDefaultApiVersion(context, client.service);
  if (!context.previewStringRegex.test(defaultApiVersion?.value || "")) {
    sdkVersionsEnum.values = sdkVersionsEnum.values.filter(
      (v) => typeof v.value === "string" && !context.previewStringRegex.test(v.value),
    );
  }
}

export function twoParamsEquivalent(
  context: TCGCContext,
  param1?: ModelProperty,
  param2?: ModelProperty,
): boolean {
  if (!param1 || !param2) {
    return false;
  }
  return (
    param1.name === param2.name ||
    getParamAlias(context, param1) === param2.name ||
    param1.name === getParamAlias(context, param2)
  );
}
/**
 * If body is from spread, then it does not directly from a model property.
 * @param httpBody
 * @param parameters
 * @returns
 */
export function isHttpBodySpread(httpBody: HttpPayloadBody): boolean {
  return httpBody.bodyKind !== "file" && httpBody.property === undefined;
}

/**
 * If body is from simple spread, then we use the original model as body model.
 * @param type
 * @returns
 */
export function getHttpBodySpreadModel(type: Model): Model {
  if (type.sourceModels.length === 1 && type.sourceModels[0].usage === "spread") {
    const innerModel = type.sourceModels[0].model;
    // for case: `op test(...Model):void;`
    if (innerModel.name !== "" && innerModel.properties.size === type.properties.size) {
      return innerModel;
    }
    // for case: `op test(@header h: string, @query q: string, ...Model): void;`
    if (
      innerModel.sourceModels.length === 1 &&
      innerModel.sourceModels[0].usage === "spread" &&
      innerModel.sourceModels[0].model.name !== "" &&
      innerModel.sourceModels[0].model.properties.size === type.properties.size
    ) {
      return innerModel.sourceModels[0].model;
    }
  }
  return type;
}

export function isOnClient(
  context: TCGCContext,
  type: ModelProperty,
  operation?: Operation,
  versioning?: boolean,
): boolean {
  const client = operation ? context.getClientForOperation(operation) : undefined;
  return (
    isSubscriptionId(context, type) ||
    (isApiVersion(context, type) && versioning) ||
    Boolean(
      client &&
        context.__clientParametersCache
          .get(client)
          ?.find((x) => twoParamsEquivalent(context, x.__raw, type)),
    )
  );
}

export function getValueTypeValue(
  value: Value,
): string | boolean | null | number | Array<unknown> | object | undefined {
  switch (value.valueKind) {
    case "ArrayValue":
      return value.values.map((x) => getValueTypeValue(x));
    case "BooleanValue":
    case "StringValue":
    case "NullValue":
      return value.value;
    case "NumericValue":
      return value.value.asNumber();
    case "EnumValue":
      return value.value.value ?? value.value.name;
    case "ObjectValue":
      return Object.fromEntries(
        [...value.properties.keys()].map((x) => [
          x,
          getValueTypeValue(value.properties.get(x)!.value),
        ]),
      );
    case "ScalarValue":
      // TODO: handle scalar value
      return undefined;
  }
}

export function hasNoneVisibility(context: TCGCContext, type: ModelProperty): boolean {
  const lifecycle = getLifecycleVisibilityEnum(context.program);
  const visibility = getVisibilityForClass(context.program, type, lifecycle);
  return visibility.size === 0;
}

function listAllNamespaces(
  context: TCGCContext,
  namespace: Namespace,
  retval?: Namespace[],
): Namespace[] {
  if (!retval) {
    retval = [];
  }
  if (retval.includes(namespace)) return retval;
  retval.push(namespace);
  for (const ns of namespace.namespaces.values()) {
    listAllNamespaces(context, ns, retval);
  }
  return retval;
}

export function listAllUserDefinedNamespaces(context: TCGCContext): Namespace[] {
  return listAllNamespaces(context, context.getMutatedGlobalNamespace()).filter((ns) =>
    $(context.program).type.isUserDefined(ns),
  );
}

export function findRootSourceProperty(property: ModelProperty): ModelProperty {
  while (property.sourceProperty) {
    property = property.sourceProperty;
  }
  return property;
}

export function getStreamAsBytes(
  context: TCGCContext,
  type: Type,
): [SdkBuiltInType, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  const unknownType: SdkBuiltInType = {
    ...diagnostics.pipe(getSdkTypeBaseHelper(context, type, "bytes")),
    name: "bytes",
    encode: "bytes",
    crossLanguageDefinitionId: "",
  };
  return diagnostics.wrap(unknownType);
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

export function handleVersioningMutationForGlobalNamespace(context: TCGCContext): Namespace {
  const globalNamespace = context.program.getGlobalNamespaceType();
  const allApiVersions = context.getPackageVersions();
  if (allApiVersions.length === 0 || context.apiVersion === "all") return globalNamespace;

  const mutator = getVersioningMutator(
    context,
    listServices(context.program)[0].type,
    allApiVersions[allApiVersions.length - 1],
  );
  const subgraph = unsafe_mutateSubgraphWithNamespace(context.program, [mutator], globalNamespace);
  compilerAssert(subgraph.type.kind === "Namespace", "Should not have mutated to another type");
  return subgraph.type;
}

export function resolveDuplicateGenearatedName(
  context: TCGCContext,
  type: Union | Model | TspLiteralType,
  createName: string,
): string {
  let duplicateCount = 1;
  const rawCreateName = createName;
  const generatedNames = [...context.__generatedNames.values()];
  while (generatedNames.includes(createName)) {
    createName = `${rawCreateName}${duplicateCount++}`;
  }
  context.__generatedNames.set(type, createName);
  return createName;
}

export function resolveConflictGeneratedName(context: TCGCContext) {
  const userDefinedNames = [...context.__referencedTypeCache.values()]
    .filter((x) => !x.isGeneratedName)
    .map((x) => x.name);
  const generatedNames = [...context.__generatedNames.values()];
  for (const sdkType of context.__referencedTypeCache.values()) {
    if (sdkType.__raw && sdkType.isGeneratedName && userDefinedNames.includes(sdkType.name)) {
      const rawName = sdkType.name;
      let duplicateCount = 1;
      let createName = `${rawName}${duplicateCount++}`;
      while (userDefinedNames.includes(createName) || generatedNames.includes(createName)) {
        createName = `${rawName}${duplicateCount++}`;
      }
      sdkType.name = createName;
      context.__generatedNames.set(sdkType.__raw, createName);
      generatedNames.push(createName);
    }
  }
}

export function getClientDoc(context: TCGCContext, target: Type): string | undefined {
  const clientDocExplicit = getClientDocExplicit(context, target);
  const baseDoc = getDoc(context.program, target);
  if (clientDocExplicit) {
    switch (clientDocExplicit.mode) {
      case "append":
        return baseDoc
          ? `${baseDoc}\n${clientDocExplicit.documentation}`
          : clientDocExplicit.documentation;
      case "replace":
        return clientDocExplicit.documentation;
    }
  }
  return baseDoc;
}

export function compareModelProperties(
  context: TCGCContext | undefined,
  modelPropA: ModelProperty | undefined,
  modelPropB: ModelProperty | undefined,
): boolean {
  if (!modelPropA || !modelPropB) return false;
  if (modelPropA.name !== modelPropB.name || modelPropA.type !== modelPropB.type) return false;
  if (!context) return true; // if we don't have a context, we can't further compare the types. Assume true.
  const sdkA = ignoreDiagnostics(getSdkModelPropertyType(context, modelPropA));
  const sdkB = ignoreDiagnostics(getSdkModelPropertyType(context, modelPropB));
  if (sdkA.kind === "method" || sdkB.kind === "method") {
    // if we're comparing method vs service param, we just need to check the name and type
    return true;
  }
  switch (sdkA.kind) {
    case "cookie":
    case "header":
    case "query":
    case "path":
    case "responseheader":
    case "body":
      return sdkA.kind === sdkB.kind && sdkA.serializedName === sdkB.serializedName;
    default:
      return sdkA.kind === sdkB.kind;
  }
}
