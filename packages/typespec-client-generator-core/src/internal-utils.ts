import {
  BooleanLiteral,
  Diagnostic,
  Interface,
  Model,
  Namespace,
  NumericLiteral,
  Operation,
  Program,
  ProjectedProgram,
  StringLiteral,
  Type,
  Union,
  createDiagnosticCollector,
  getDeprecationDetails,
  getDoc,
  getNamespaceFullName,
  getSummary,
  isNeverType,
  isNullType,
  isVoidType,
} from "@typespec/compiler";
import { HttpOperation, HttpStatusCodeRange } from "@typespec/http";
import { getAddedOnVersions, getRemovedOnVersions, getVersions } from "@typespec/versioning";
import {
  SdkBuiltInKinds,
  SdkBuiltInType,
  SdkClient,
  SdkEnumType,
  SdkHttpResponse,
  SdkModelPropertyType,
  SdkModelType,
  SdkParameter,
  SdkType,
  SdkUnionType,
} from "./interfaces.js";
import { createDiagnostic } from "./lib.js";
import {
  getCrossLanguageDefinitionId,
  getEffectivePayloadType,
  getHttpOperationWithCache,
  isApiVersion,
} from "./public-utils.js";

/**
 *
 * @param emitterName Full emitter name
 * @returns The language of the emitter. I.e. "@azure-tools/typespec-csharp" will return "csharp"
 */
export function parseEmitterName(
  program: Program,
  emitterName?: string
): [string, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  if (!emitterName) {
    diagnostics.add(
      createDiagnostic({
        code: "no-emitter-name",
        format: {},
        target: program.getGlobalNamespaceType(),
      })
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
  namespace?: Namespace
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
  namespace?: Namespace | Interface
): {
  isApiVersionParam: boolean;
  clientDefaultValue?: unknown;
  onClient: boolean;
} {
  const isApiVersionParam = isApiVersion(context, type);
  return {
    isApiVersionParam,
    clientDefaultValue:
      isApiVersionParam && namespace
        ? context.__namespaceToApiVersionClientDefaultValue.get(namespace)
        : undefined,
    onClient: onClient(context, type),
  };
}

export function filterApiVersionsWithDecorators(
  context: TCGCContext,
  type: Type,
  apiVersions: string[]
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
  wrapper?: Type
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

interface DocWrapper {
  description?: string;
  details?: string;
}

/**
 *
 * @param context
 * @param type
 * @returns Returns the description and details of a type
 */
export function getDocHelper(context: TCGCContext, type: Type): DocWrapper {
  const program = context.program;
  if (getSummary(program, type)) {
    return {
      description: getSummary(program, type),
      details: getDoc(program, type),
    };
  }
  return {
    description: getDoc(program, type),
  };
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
    return type.values.map((x) => getHashForType(x)).join("|");
  }
  return type.kind;
}

interface DefaultSdkTypeBase<TKind> {
  __raw: Type;
  deprecation?: string;
  kind: TKind;
}

/**
 * Helper function to return default values for encode etc
 * @param type
 */
export function getSdkTypeBaseHelper<TKind>(
  context: TCGCContext,
  type: Type,
  kind: TKind
): DefaultSdkTypeBase<TKind> {
  return {
    __raw: type,
    deprecation: getDeprecationDetails(context.program, type)?.message,
    kind,
  };
}

export function intOrFloat(value: number): "int32" | "float32" {
  return value.toString().indexOf(".") === -1 ? "int32" : "float32";
}

/**
 * Whether a model or enum or union as enum is in Azure.Core[.Foundations] namespace
 * @param t
 * @returns
 */
export function isAzureCoreModel(t: Type): boolean {
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

export interface TCGCContext {
  program: Program;
  emitterName: string;
  generateProtocolMethods?: boolean;
  generateConvenienceMethods?: boolean;
  filterOutCoreModels?: boolean;
  packageName?: string;
  flattenUnionAsEnum?: boolean;
  arm?: boolean;
  modelsMap?: Map<Type, SdkModelType | SdkEnumType>;
  operationModelsMap?: Map<Operation, Map<Type, SdkModelType | SdkEnumType>>;
  generatedNames?: Map<Union | Model | TspLiteralType, string>;
  httpOperationCache?: Map<Operation, HttpOperation>;
  unionsMap?: Map<Union, SdkUnionType>;
  __namespaceToApiVersionParameter: Map<Interface | Namespace, SdkParameter>;
  __tspTypeToApiVersions: Map<Type, string[]>;
  __namespaceToApiVersionClientDefaultValue: Map<Interface | Namespace, string | undefined>;
  knownScalars?: Record<string, SdkBuiltInKinds>;
  diagnostics: readonly Diagnostic[];
  __subscriptionIdParameter?: SdkParameter;
  __rawClients?: SdkClient[];
  apiVersion?: string;
  __service_projection?: Map<Namespace, [Namespace, ProjectedProgram | undefined]>;
  originalProgram: Program;
}

export function createTCGCContext(program: Program): TCGCContext {
  return {
    program,
    emitterName: "__TCGC_INTERNAL__",
    diagnostics: [],
    originalProgram: program,
    __namespaceToApiVersionParameter: new Map(),
    __tspTypeToApiVersions: new Map(),
    __namespaceToApiVersionClientDefaultValue: new Map(),
  };
}

export function getNonNullOptions(type: Union): Type[] {
  return [...type.variants.values()].map((x) => x.type).filter((t) => !isNullType(t));
}

export function getNullOption(type: Union): Type | undefined {
  return [...type.variants.values()].map((x) => x.type).filter((t) => isNullType(t))[0];
}

export function getAllResponseBodiesAndNonBodyExists(
  responses: Map<HttpStatusCodeRange | number | "*", SdkHttpResponse>
): {
  allResponseBodies: SdkType[];
  nonBodyExists: boolean;
} {
  const allResponseBodies: SdkType[] = [];
  let nonBodyExists = false;
  for (const response of responses.values()) {
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

export function getAllResponseBodies(
  responses: Map<HttpStatusCodeRange | number | "*", SdkHttpResponse>
): SdkType[] {
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
  suffix: string
): string {
  return `${getCrossLanguageDefinitionId(context, type).split(".").at(-1)}${suffix}`;
}

function isOperationBodyType(context: TCGCContext, type: Type, operation?: Operation): boolean {
  if (type.kind !== "Model") return false;
  if (!isHttpOperation(context, operation)) return false;
  const httpBody = operation
    ? getHttpOperationWithCache(context, operation).parameters.body
    : undefined;
  return Boolean(
    httpBody &&
      httpBody.type.kind === "Model" &&
      getEffectivePayloadType(context, httpBody.type) === getEffectivePayloadType(context, type)
  );
}

export function isMultipartFormData(
  context: TCGCContext,
  type: Type,
  operation?: Operation
): boolean {
  return isMultipartOperation(context, operation) && isOperationBodyType(context, type, operation);
}

export function isSubscriptionId(context: TCGCContext, parameter: { name: string }): boolean {
  return Boolean(context.arm) && parameter.name === "subscriptionId";
}

export function onClient(context: TCGCContext, parameter: { name: string }): boolean {
  return isSubscriptionId(context, parameter) || isApiVersion(context, parameter);
}

export function getLocationOfOperation(operation: Operation): Namespace | Interface {
  // have to check interface first, because interfaces are more granular than namespaces
  return (operation.interface || operation.namespace)!;
}

export function isNeverOrVoidType(type: Type): boolean {
  return isNeverType(type) || isVoidType(type);
}

export function getAnyType(): SdkBuiltInType {
  return {
    kind: "any",
    encode: "string",
  };
}
