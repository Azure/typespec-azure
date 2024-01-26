import {
  getDeprecationDetails,
  getDoc,
  getEffectiveModelType,
  getFriendlyName,
  getNamespaceFullName,
  getProjectedName,
  getSummary,
  ignoreDiagnostics,
  Interface,
  listServices,
  Model,
  ModelProperty,
  Namespace,
  Operation,
  resolveEncodedName,
  Type,
  Union,
} from "@typespec/compiler";
import {
  getHeaderFieldName,
  getHttpOperation,
  getPathParamName,
  getQueryParamName,
  HttpOperationParameter,
  isStatusCode,
} from "@typespec/http";
import { getVersions, Version } from "@typespec/versioning";
import { pascalCase } from "change-case";
import pluralize from "pluralize";
import {
  getClientNameOverride,
  listClients,
  listOperationGroups,
  listOperationsInOperationGroup,
} from "./decorators.js";
import { SdkContext } from "./interfaces.js";
import { parseEmitterName } from "./internal-utils.js";
import { reportDiagnostic } from "./lib.js";

/**
 * Return the default api version for a versioned service. Will return undefined if one does not exist
 * @param program
 * @param serviceNamespace
 * @returns
 */
export function getDefaultApiVersion(
  context: SdkContext,
  serviceNamespace: Namespace
): Version | undefined {
  try {
    const versions = getVersions(context.program, serviceNamespace)[1]!.getVersions();
    // follow versioning principals of the versioning library and return last in list
    return versions[versions.length - 1];
  } catch (e) {
    return undefined;
  }
}
/**
 * Return whether a parameter is the Api Version parameter of a client
 * @param program
 * @param parameter
 * @returns
 */
export function isApiVersion(
  context: SdkContext,
  parameter: HttpOperationParameter | ModelProperty
): boolean {
  return (
    parameter.name.toLowerCase() === "apiversion" || parameter.name.toLowerCase() === "api-version"
  );
}

/**
 * Get the client's namespace for generation. If package-name is passed in config, we return
 * that value as our namespace. Otherwise, we default to the TypeSpec service namespace.
 * @param program
 * @param context
 * @returns
 */
export function getClientNamespaceString(context: SdkContext): string | undefined {
  let packageName = context.packageName;
  if (packageName) {
    packageName = packageName
      .replace(/-/g, ".")
      .replace(/\.([a-z])?/g, (match: string) => match.toUpperCase());
    return packageName.charAt(0).toUpperCase() + packageName.slice(1);
  }
  const services = listServices(context.program);
  if (services.length === 0) {
    return undefined;
  }
  return getNamespaceFullName(services[0].type);
}

/**
 * If the given type is an anonymous model and all of its properties excluding
 * header/query/path/status-code are sourced from a named model, returns that original named model.
 * Otherwise the given type is returned unchanged.
 *
 * @param context
 * @param type
 * @returns
 */
export function getEffectivePayloadType(context: SdkContext, type: Model): Model {
  const program = context.program;

  // if a type has name, we should resolve the name
  // this logic is for template cases, for e.g.,
  // model Catalog is TrackedResource<CatalogProperties>{}
  // model Deployment is TrackedResource<DeploymentProperties>{}
  // when pass them to getEffectiveModelType, we will get two different types
  // with the same name "TrackedResource" which will loose original infomation
  if (type.name) {
    return type;
  }

  function isSchemaProperty(property: ModelProperty) {
    const program = context.program;
    const headerInfo = getHeaderFieldName(program, property);
    const queryInfo = getQueryParamName(program, property);
    const pathInfo = getPathParamName(program, property);
    const statusCodeinfo = isStatusCode(program, property);
    return !(headerInfo || queryInfo || pathInfo || statusCodeinfo);
  }

  const effective = getEffectiveModelType(program, type, isSchemaProperty);
  if (effective.name) {
    return effective;
  }
  return type;
}

/**
 * Whether a model is an Azure.Core model or not
 * @param t
 * @returns
 */
export function isAzureCoreModel(t: Type): boolean {
  return (
    t.kind === "Model" &&
    t.namespace !== undefined &&
    ["Azure.Core", "Azure.Core.Foundations"].includes(getNamespaceFullName(t.namespace))
  );
}

/**
 *
 * @deprecated This function is deprecated. Please pass in your emitter name as a parameter name to createSdkContext
 */
export function getEmitterTargetName(context: SdkContext): string {
  return parseEmitterName(context.program.emitters[0]?.metadata?.name); // eslint-disable-line deprecation/deprecation
}

/**
 * Get the library and wire name of a model property. Takes @clientName and @encodedName into account
 * @param context
 * @param property
 * @returns a tuple of the library and wire name for a model property
 */
export function getPropertyNames(context: SdkContext, property: ModelProperty): [string, string] {
  return [getLibraryName(context, property), getWireName(context, property)];
}

/**
 * Get the library name of a property / parameter / operation / model / enum. Takes projections into account
 *
 * Returns name in the following order of priority
 * 1. language emitter name, i.e. @clientName("csharpSpecificName", "csharp") => "csharpSpecificName"
 * 2. client name, i.e. @clientName(""clientName") => "clientName"
 * 3. deprecated projected name
 * 4. friendly name, i.e. @friendlyName("friendlyName") => "friendlyName"
 * 5. name in typespec
 *
 * @param context
 * @param type
 * @returns the library name for a typespec type
 */
export function getLibraryName(context: SdkContext, type: Type & { name?: string }): string {
  // 1. check if there's a client name
  let emitterSpecificName = getClientNameOverride(context, type);
  if (emitterSpecificName) return emitterSpecificName;

  // 2. check if there's a specific name for our language with deprecated @projectedName
  emitterSpecificName = getProjectedName(context.program, type, context.emitterName);
  if (emitterSpecificName) return emitterSpecificName;

  // 3. check if there's a client name with deprecated @projectedName
  const clientSpecificName = getProjectedName(context.program, type, "client");
  if (clientSpecificName) return clientSpecificName;

  // 4. check if there's a friendly name, if so return friendly name, otherwise return undefined
  return getFriendlyName(context.program, type) ?? type.name;
}

export function capitalize(name: string): string {
  return name[0].toUpperCase() + name.slice(1);
}

export function reportUnionUnsupported(context: SdkContext, type: Union): void {
  reportDiagnostic(context.program, { code: "union-unsupported", target: type });
}

export function intOrFloat(value: number): "int32" | "float32" {
  return value.toString().indexOf(".") === -1 ? "int32" : "float32";
}

interface DocWrapper {
  description?: string;
  details?: string;
}

export function getDocHelper(context: SdkContext, type: Type): DocWrapper {
  if (getSummary(context.program, type)) {
    return {
      description: getSummary(context.program, type),
      details: getDoc(context.program, type),
    };
  }
  return {
    description: getDoc(context.program, type),
  };
}

export function getWireName(context: SdkContext, type: Type & { name: string }) {
  // 1. Check if there's an encoded name
  const encodedName = resolveEncodedName(context.program, type, "application/json");
  if (encodedName !== type.name) return encodedName;
  // 2. Check if there's deprecated language projection
  return getProjectedName(context.program, type, "json") ?? type.name;
}

interface SdkTypeBaseHelper<TKind> {
  __raw?: Type;
  nullable: boolean;
  deprecation?: string;
  kind: TKind;
}

/**
 * Helper function to return default values for nullable, encode etc
 * @param type
 */
export function getSdkTypeBaseHelper<TKind>(
  context: SdkContext,
  type: Type | string,
  kind: TKind
): SdkTypeBaseHelper<TKind> {
  if (typeof type === "string") {
    return {
      nullable: false,
      kind,
    };
  }
  return {
    __raw: type,
    nullable: false,
    deprecation: getDeprecationDetails(context.program, type)?.message,
    kind,
  };
}

/**
 * Helper function to return cross language definition id for a type
 * @param type
 * @returns
 */
export function getCrossLanguageDefinitionId(type: {
  name: string;
  kind: string;
  interface?: Interface;
  namespace?: Namespace;
}): string {
  let retval = type.name;
  if (type.kind === "Operation" && type.interface) {
    retval = `${type.interface.name}.${retval}`;
  }
  if (type.namespace) {
    retval = `${getNamespaceFullName(type.namespace!)}.${retval}`;
  }
  return retval;
}

/**
 * Create a name for anonymous model
 * @param context
 * @param type
 */
export function getGeneratedName(
  context: SdkContext,
  type: Model | Union,
  operation?: Operation
): string {
  if (!context.generatedNames) {
    context.generatedNames = new Set<string>();
  }

  const contextPath = operation
    ? getContextPath(context, operation, type)
    : findContextPath(context, type);
  const createdName = buildNameFromContextPaths(context, contextPath);
  return createdName;
}

/**
 * Traverse each operation and model to find one possible context path for the given type.
 * @param context
 * @param type
 * @returns
 */
function findContextPath(context: SdkContext, type: Model | Union): ContextNode[] {
  for (const client of listClients(context)) {
    for (const operation of listOperationsInOperationGroup(context, client)) {
      const result = getContextPath(context, operation, type);
      if (result.length > 0) {
        return result;
      }
    }
    for (const operationGroup of listOperationGroups(context, client)) {
      for (const operation of listOperationsInOperationGroup(context, operationGroup)) {
        const result = getContextPath(context, operation, type);
        if (result.length > 0) {
          return result;
        }
      }
    }
    // orphan models
    if (client.service) {
      for (const model of client.service.models.values()) {
        const result = getContextPath(context, model, type);
        if (result.length > 0) {
          return result;
        }
      }
    }
  }
  return [];
}

interface ContextNode {
  displayName: string;
  type?: Model | Union;
}

/**
 * Find one possible context path for the given type in the given operation or model.
 * @param context
 * @param root
 * @param typeToFind
 * @returns
 */
function getContextPath(
  context: SdkContext,
  root: Operation | Model,
  typeToFind: Model | Union
): ContextNode[] {
  const program = context.program;
  // use visited set to avoid cycle model reference
  const visited: Set<Type> = new Set<Type>();
  let result: ContextNode[];

  if (root.kind === "Operation") {
    const httpOperation = ignoreDiagnostics(getHttpOperation(program, root));

    if (httpOperation.parameters.body) {
      visited.clear();
      result = [{ displayName: pascalCase(root.name) }];
      if (dfsModelProperties(typeToFind, httpOperation.parameters.body.type, "Request")) {
        return result;
      }
    }

    for (const parameter of Object.values(httpOperation.parameters.parameters)) {
      visited.clear();
      result = [{ displayName: pascalCase(root.name) }];
      if (dfsModelProperties(typeToFind, parameter.param.type, "Request")) {
        return result;
      }
    }

    for (const response of httpOperation.responses) {
      for (const innerResponse of response.responses) {
        if (innerResponse.body?.type) {
          visited.clear();
          result = [{ displayName: pascalCase(root.name) }];
          if (dfsModelProperties(typeToFind, innerResponse.body.type, "Response")) {
            return result;
          }
        }

        if (innerResponse.headers) {
          for (const header of Object.values(innerResponse.headers)) {
            visited.clear();
            result = [{ displayName: pascalCase(root.name) }];
            if (dfsModelProperties(typeToFind, header.type, "Response")) {
              return result;
            }
          }
        }
      }
    }
  } else {
    visited.clear();
    result = [];
    if (dfsModelProperties(typeToFind, root, root.name)) {
      return result;
    }
  }
  return [];

  /**
   * Traverse each node, if it is not model or union, no need to traverse anymore.
   * If it is the expected type just return.
   * If it is array or dict, traverse the array/dict item node. e.g. {name: string}[] case.
   * If it is model, add the current node to the path and traverse each property node.
   * If it is model, traverse the base and derived model node if existed.
   * @param expectedType
   * @param currentType
   * @param displayName
   * @param currentContextPath
   * @param contextPaths
   * @param visited
   * @returns
   */
  function dfsModelProperties(
    expectedType: Model | Union,
    currentType: Type,
    displayName: string
  ): boolean {
    if (currentType == null || visited.has(currentType)) {
      // cycle reference detected
      return false;
    }

    if (!(currentType.kind === "Model" || currentType.kind === "Union")) {
      return false;
    }

    visited.add(currentType);

    if (currentType === expectedType) {
      result.push({ displayName: pascalCase(displayName), type: currentType });
      return true;
    } else if (currentType.kind === "Model" && currentType.indexer) {
      // handle array or dict
      const dictOrArrayItemType: Type = currentType.indexer.value;
      return dfsModelProperties(expectedType, dictOrArrayItemType, pluralize.singular(displayName));
    } else if (currentType.kind === "Model") {
      currentType = getEffectivePayloadType(context, currentType);
      // handle model
      result.push({ displayName: pascalCase(displayName), type: currentType });
      for (const property of currentType.properties.values()) {
        // traverse model property
        // use property.name as displayName
        const result = dfsModelProperties(expectedType, property.type, property.name);
        if (result) return true;
      }
      result.pop();
      if (currentType.baseModel) {
        const result = dfsModelProperties(
          expectedType,
          currentType.baseModel,
          currentType.baseModel.name
        );
        if (result) return true;
      }
      for (const derivedModel of currentType.derivedModels) {
        const result = dfsModelProperties(expectedType, derivedModel, derivedModel.name);
        if (result) return true;
      }
      return false;
    } else {
      // handle union
      for (const unionType of currentType.variants.values()) {
        // traverse union type
        // use unionType.name as displayName
        const result = dfsModelProperties(expectedType, unionType.type, displayName);
        if (result) return true;
      }
      return false;
    }
  }
}

/**
 * The logic is basically three steps:
 * 1. find the last nonanonymous model node, this node can be operation node or model node which is not anonymous
 * 2. build the name from the last nonanonymous model node to the end of the path
 * 3. simplely handle duplication with adding number suffix
 * @param contextPaths
 * @returns
 */
function buildNameFromContextPaths(context: SdkContext, contextPath: ContextNode[]): string {
  // fallback to empty name for corner case
  if (contextPath.length === 0) {
    return "";
  }

  // 1. find the last nonanonymous model node
  let lastNonAnonymousModelNodeIndex = contextPath.length - 1;
  while (lastNonAnonymousModelNodeIndex >= 0) {
    if (
      !contextPath[lastNonAnonymousModelNodeIndex].type ||
      contextPath[lastNonAnonymousModelNodeIndex].type?.name
    ) {
      // it's nonanonymous model node (if no type defined, it's the operation node)
      break;
    } else {
      --lastNonAnonymousModelNodeIndex;
    }
  }
  // 2. build name
  let createName: string = "";
  for (let j = lastNonAnonymousModelNodeIndex; j < contextPath.length; j++) {
    if (!contextPath[j]?.type?.name) {
      // is anonymous model node
      createName = `${createName}${contextPath[j].displayName}`;
    } else {
      // is non-anonymous model, use type name
      createName = `${createName}${contextPath[j]!.type!.name!}`;
    }
  }
  // 3. simplely handle duplication
  let duplicateCount = 1;
  const rawCreateName = createName;
  while (context.generatedNames?.has(createName)) {
    createName = `${rawCreateName}${duplicateCount++}`;
  }
  if (context.generatedNames) {
    context.generatedNames.add(createName);
  } else {
    context.generatedNames = new Set<string>([createName]);
  }
  return createName;
}
