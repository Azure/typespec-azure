import {
  BooleanLiteral,
  createDiagnosticCollector,
  Diagnostic,
  getDeprecationDetails,
  getNamespaceFullName,
  Interface,
  isNeverType,
  isNullType,
  isVoidType,
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
  HttpOperation,
  HttpOperationBody,
  HttpOperationMultipartBody,
  HttpOperationResponseContent,
} from "@typespec/http";
import { getAddedOnVersions, getRemovedOnVersions, getVersions } from "@typespec/versioning";
import { getParamAlias } from "./decorators.js";
import {
  DecoratorInfo,
  SdkBuiltInType,
  SdkClient,
  SdkEnumType,
  SdkHttpResponse,
  SdkModelPropertyType,
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
import { getClientTypeWithDiagnostics } from "./types.js";

export const AllScopes = Symbol.for("@azure-core/typespec-client-generator-core/all-scopes");

export const clientNameKey = createStateSymbol("clientName");

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
 * @param namespace If we know explicitly the namespace of the client, pass this in
 * @returns The name of the namespace
 */
export function getClientNamespaceStringHelper(
  context: TCGCContext,
  namespace?: Namespace,
): string | undefined {
  let packageName = context.packageName;
  if (packageName) {
    packageName = packageName
      .replace(/-/g, ".")
      .replace(/\.([a-z])?/g, (match: string) => match.toUpperCase());
    return packageName.charAt(0).toUpperCase() + packageName.slice(1);
  }
  if (namespace) {
    return getNamespaceFullName(namespace);
  }
  return undefined;
}

/**
 *
 * @param context
 * @param type The type that we are adding api version information onto
 * @returns Whether the type is the api version parameter and the default value for the client
 */
export function updateWithApiVersionInformation(
  context: TCGCContext,
  type: { name: string },
  namespace?: Namespace | Interface,
): {
  isApiVersionParam: boolean;
  clientDefaultValue?: string;
} {
  const isApiVersionParam = isApiVersion(context, type);
  return {
    isApiVersionParam,
    clientDefaultValue:
      isApiVersionParam && namespace
        ? context.__clientToApiVersionClientDefaultValue.get(namespace)
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

function sortAndRemoveDuplicates(a: string[], b: string[], apiVersions: string[]): string[] {
  const union = Array.from(new Set([...a, ...b]));
  return apiVersions.filter((item) => union.includes(item));
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
    wrapperApiVersions = context.__tspTypeToApiVersions.get(wrapper) || [];
  }

  const allApiVersions =
    getVersions(context.program, type)[1]
      ?.getVersions()
      .map((x) => x.value) || [];

  const apiVersions = wrapperApiVersions.length ? wrapperApiVersions : allApiVersions;
  if (!apiVersions) return [];
  const explicitlyDecorated = filterApiVersionsWithDecorators(context, type, apiVersions);
  if (explicitlyDecorated.length) {
    context.__tspTypeToApiVersions.set(type, explicitlyDecorated);
    return explicitlyDecorated;
  }
  // we take the union of all of the api versions that the type is available on
  // if it's called multiple times with diff wrappers, we want to make sure we have
  // all of the possible api versions listed
  const existing = context.__tspTypeToApiVersions.get(type) || [];
  const retval = sortAndRemoveDuplicates(wrapperApiVersions, existing, allApiVersions);
  context.__tspTypeToApiVersions.set(type, retval);
  return retval;
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
      if (response.type.kind === "nullable") {
        nonBodyExists = true;
      }
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

export function getLocationOfOperation(operation: Operation): Namespace | Interface {
  // have to check interface first, because interfaces are more granular than namespaces
  return (operation.interface || operation.namespace)!;
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

export function getValidApiVersion(context: TCGCContext, versions: string[]): string | undefined {
  let apiVersion = context.apiVersion;
  if (apiVersion === "all") {
    return apiVersion;
  }
  if (apiVersion === "latest" || apiVersion === undefined || !versions.includes(apiVersion)) {
    apiVersion = versions[versions.length - 1];
  }
  return apiVersion;
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

export function isJsonContentType(contentType: string): boolean {
  const regex = new RegExp(/^(application|text)\/(.+\+)?json$/);
  return regex.test(contentType);
}

export function isXmlContentType(contentType: string): boolean {
  const regex = new RegExp(/^(application|text)\/(.+\+)?xml$/);
  return regex.test(contentType);
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
export function isHttpBodySpread(httpBody: HttpOperationBody | HttpOperationMultipartBody) {
  return httpBody.property === undefined;
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
  const namespace = operation ? getLocationOfOperation(operation) : type.model?.namespace;
  return (
    isSubscriptionId(context, type) ||
    (isApiVersion(context, type) && versioning) ||
    Boolean(
      namespace &&
        context.__clientToParameters
          .get(namespace)
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
