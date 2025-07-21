import { getAllProperties } from "@azure-tools/typespec-azure-core";
import {
  $tag,
  ArrayModelType,
  getProperty as compilerGetProperty,
  DecoratorContext,
  getKeyName,
  getTags,
  Interface,
  isArrayModelType,
  isGlobalNamespace,
  isNeverType,
  isTemplateDeclaration,
  Model,
  ModelProperty,
  Namespace,
  Operation,
  Program,
  Type,
} from "@typespec/compiler";
import { getHttpOperation, isPathParam } from "@typespec/http";
import { $autoRoute, getParentResource, getSegment } from "@typespec/rest";
import {
  ArmProviderNameValueDecorator,
  ArmResourceOperationsDecorator,
  ArmVirtualResourceDecorator,
  ExtensionResourceDecorator,
  IdentifiersDecorator,
  LocationResourceDecorator,
  ResourceBaseTypeDecorator,
  ResourceGroupResourceDecorator,
  ResourceOperationOptions,
  SingletonDecorator,
  SubscriptionResourceDecorator,
  TenantResourceDecorator,
} from "../generated-defs/Azure.ResourceManager.js";
import { CustomAzureResourceDecorator } from "../generated-defs/Azure.ResourceManager.Legacy.js";
import { reportDiagnostic } from "./lib.js";
import {
  getArmProviderNamespace,
  isArmLibraryNamespace,
  resolveProviderNamespace,
} from "./namespace.js";
import {
  ArmOperationKind,
  ArmResolvedOperationsForResource,
  ArmResourceOperation,
  ArmResourceOperations,
  getArmOperationIdentifier,
  getArmResourceOperationList,
  resolveResourceOperations,
} from "./operations.js";
import { getArmResource, listArmResources, registerArmResource } from "./private.decorators.js";
import { ArmStateKeys } from "./state.js";

export type ArmResourceKind = "Tracked" | "Proxy" | "Extension" | "Virtual" | "Custom" | "BuiltIn";

/**
 * The base details for all kinds of resources
 *
 * @interface
 */
export interface ArmResourceDetailsBase {
  /**
   * The name of the resource.
   */
  name: string;
  /** The category of resource */
  kind: ArmResourceKind;
  /** The RP namespace */
  armProviderNamespace: string;
  /** The name parameter for the resource */
  keyName: string;
  /** The type name / collection name of the resource */
  collectionName: string;
  /** A reference to the TypeSpec type */
  typespecType: Model;
}

/** Details for RP resources */
export interface ArmResourceDetails extends ArmResourceDetailsBase {
  /** The set of lifecycle operations and actions for the resource */
  operations: ArmResourceOperations;
  /** RPaaS-specific value for resource type */
  resourceTypePath?: string;
}

/** Representation of a resource used but not provided by the RP */
export interface ArmVirtualResourceDetails {
  /** The base kind for resources not provided by RPs */
  kind: "Virtual";
  /** The provider namespace for the provider of this resource */
  provider?: string;
}

/** New base details for resolved resources */
export interface ResourceMetadata {
  /** The model type for the resource */
  type: Model;
  /** The kind of resource (extension | tracked | proxy | custom | virtual | built-in) */
  kind: ArmResourceKind;
  /** The provider namespace */
  providerNamespace: string;
}

/** New details for a resolved resource */
export interface ResolvedResource extends ResourceMetadata {
  /** The set of resolved operations for a resource.  For most 
        resources there will be 1 returned record */
  operations?: ResolvedOperations[];
}

export interface ResolvedResources {
  resources?: ResolvedResource[];
  unassociatedOperations?: ArmResourceOperation[];
}

export interface ResolvedOperationResourceInfo {
  /** The resource type (The actual resource type string will be "${provider}/${types.join("/")}) */
  resourceType: ResourceType;
  /** The path to the instance of a resource */
  resourceInstancePath: string;
}

/** Resolved operations, including operations for non-arm resources */
export interface ResolvedOperations extends ResolvedOperationResourceInfo {
  /** The lifecycle and action operations using this resourceInstancePath (or the parent path) */
  operations: ArmResolvedOperationsForResource;
  /** Other operations associated with this resource */
  associatedOperations?: ArmResourceOperation[];
}

/** Description of the resource type */
export interface ResourceType {
  /** The provider namespace */
  provider: string;
  /** The type of the resource, including all ancestor types (in order) */
  types: string[];
}

/**
 * Marks the given resource as an external resource
 * @param context The decorator context
 * @param entity The resource model
 * @param propertiesType The type of the resource properties
 */
export const $armVirtualResource: ArmVirtualResourceDecorator = (
  context: DecoratorContext,
  entity: Model,
  provider: string | undefined = undefined,
) => {
  const { program } = context;
  if (isTemplateDeclaration(entity)) return;
  const result: ArmVirtualResourceDetails = {
    kind: "Virtual",
    provider,
  };
  program.stateMap(ArmStateKeys.armBuiltInResource).set(entity, result);
  const pathProperty = getProperty(
    entity,
    (p) => isPathParam(program, p) && getSegment(program, p) !== undefined,
  );
  if (pathProperty === undefined) {
    reportDiagnostic(program, {
      code: "resource-without-path-and-segment",
      target: entity,
    });

    return;
  }

  const collectionName = getSegment(program, pathProperty);
  const keyName = getKeyName(program, pathProperty);
  if (collectionName === undefined || keyName === undefined) {
    reportDiagnostic(program, {
      code: "resource-without-path-and-segment",
      target: entity,
    });
    return;
  }

  registerArmResource(context, entity);
};

export const $customAzureResource: CustomAzureResourceDecorator = (
  context: DecoratorContext,
  entity: Model,
) => {
  const { program } = context;
  if (isTemplateDeclaration(entity)) return;

  program.stateMap(ArmStateKeys.customAzureResource).set(entity, "Custom");
};

function getProperty(
  target: Model,
  predicate: (property: ModelProperty) => boolean,
): ModelProperty | undefined {
  for (const prop of getAllProperties(target).values()) {
    if (predicate(prop)) return prop;
  }
  return undefined;
}

/**
 * Determine if the given model is an external resource.
 * @param program The program to process.
 * @param target The model to check.
 * @returns true if the model or any model it extends is marked as a resource, otherwise false.
 */
export function isArmVirtualResource(program: Program, target: Model): boolean {
  return getArmVirtualResourceDetails(program, target) !== undefined;
}

/**
 *
 * @param program The program to process.
 * @param target The model to get details for
 * @returns The resource details if the model is an external resource, otherwise undefined.
 */
export function getArmVirtualResourceDetails(
  program: Program,
  target: Model,
  visited: Set<Model> = new Set<Model>(),
): ArmVirtualResourceDetails | undefined {
  if (visited.has(target)) return undefined;
  visited.add(target);
  if (program.stateMap(ArmStateKeys.armBuiltInResource).has(target)) {
    return program
      .stateMap(ArmStateKeys.armBuiltInResource)
      .get(target) as ArmVirtualResourceDetails;
  }

  if (target.baseModel) {
    const details = getArmVirtualResourceDetails(program, target.baseModel, visited);
    if (details) return details;
  }
  const parent = getParentResource(program, target);
  if (parent) {
    return getArmVirtualResourceDetails(program, parent, visited);
  }
  return undefined;
}

/**
 * Determine if the given model is a custom resource.
 * @param program The program to process.
 * @param target The model to check.
 * @returns true if the model or any model it extends is marked as a resource, otherwise false.
 */
export function isCustomAzureResource(program: Program, target: Model): boolean {
  if (program.stateMap(ArmStateKeys.customAzureResource).has(target)) return true;
  if (target.baseModel) return isCustomAzureResource(program, target.baseModel);
  return false;
}

function getArmResourceItemPath(operations: ArmResourceOperations): string | undefined {
  const returnPath =
    operations.lifecycle.read?.path ||
    operations.lifecycle.createOrUpdate?.path ||
    operations.lifecycle.delete?.path;
  if (returnPath !== undefined) return returnPath;
  const actions = Object.values(operations.actions);
  if (actions.length > 0) {
    const longPath = actions[0].path;
    return longPath.substring(0, longPath.lastIndexOf("/"));
  }

  return undefined;
}

function resolveArmResourceDetails(
  program: Program,
  resource: ArmResourceDetailsBase,
): ArmResourceDetails {
  // Combine fully-resolved operation details with the base details we already have
  const operations = resolveResourceOperations(program, resource.typespecType);

  // Calculate the resource type path from the itemPath
  // TODO: This is currently a problem!  We don't have a canonical path to use for the itemPath
  const itemPath = getArmResourceItemPath(operations);
  const baseType = getResourceBaseType(program, resource.typespecType);
  const resourceTypePath = getResourceTypePath(resource, itemPath, baseType);

  return {
    ...resource,
    operations,
    resourceTypePath,
  };
}

function getResourceTypePath(
  resource: ArmResourceDetailsBase,
  itemPath: string | undefined,
  baseType: ResourceBaseType,
): string | undefined {
  if (!itemPath) {
    return undefined;
  }

  // Don't calculate resourceTypePath for tenant-level or extension resources
  if (baseType === ResourceBaseType.Tenant || baseType === ResourceBaseType.Extension) {
    return undefined;
  }

  // For other resources we start with a path that looks like: /subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Contoso/Databases/{DatabaseName}/
  // We want to move to a path that looks like this: /subscriptions/{subscriptionId}/providers/Microsoft.Contoso/Databases/
  // To do so, we need to:
  // 1) Cut out the resource name from the item path
  let temporaryPath;
  const index = itemPath.indexOf(resource.collectionName);
  if (index !== -1) {
    const truncatedPath = itemPath.slice(0, index + resource.collectionName.length);
    temporaryPath = truncatedPath;
  } else {
    temporaryPath = itemPath;
  }

  // 2) If the resource is rg-scoped, trim off the resourceGroups segments
  const pattern = /\/resourceGroups\/{[^}]+}/;
  temporaryPath = temporaryPath.replace(pattern, "");

  // 3) Trim off all the other `{}` sections (e.g. {ParentResourceName}), minus the {subscriptionId}
  const pattern1 = /\/{(?!subscriptionId)[^}]+}/; //;
  return temporaryPath.replace(pattern1, "");
}

/**
 *  This function returns fully-resolved details about all ARM resources
 *  registered in the TypeSpec document including operations and their details.
 *
 *  It should only be called after the full TypeSpec document has been compiled
 *  so that operation route details are certain to be present.
 */
export function getArmResources(program: Program): ArmResourceDetails[] {
  // Have we cached the resolved resource details already?
  const cachedResources = program.stateMap(ArmStateKeys.armResourcesCached);
  if (cachedResources.size > 0) {
    // Return the cached resource details
    return Array.from(
      program.stateMap(ArmStateKeys.armResourcesCached).values(),
    ) as ArmResourceDetails[];
  }

  // We haven't generated the full resource details yet
  const resources: ArmResourceDetails[] = [];
  for (const resource of listArmResources(program)) {
    const fullResource = resolveArmResourceDetails(program, resource);
    cachedResources.set(resource.typespecType, fullResource);
    resources.push(fullResource);
  }

  return resources;
}

export function resolveArmResources(program: Program): ResolvedResources {
  const provider = resolveProviderNamespace(program);
  if (provider === undefined) return {};
  const resolvedResources = program
    .stateMap(ArmStateKeys.armResolvedResources)
    .get(provider) as ResolvedResources;
  if (resolvedResources.resources !== undefined && resolvedResources.resources.length > 0) {
    // Return the cached resource details
    return resolvedResources;
  }

  // We haven't generated the full resource details yet
  const resources: ResolvedResource[] = [];
  for (const resource of listArmResources(program)) {
    const operations = resolveArmResourceOperations(program, resource.typespecType);
    const fullResource: ResolvedResource = {
      type: resource.typespecType,
      kind: getArmResourceKind(resource.typespecType) ?? "Tracked",
      providerNamespace: resource.armProviderNamespace,
      operations: operations,
    };
    resources.push(fullResource);
  }

  // Add the unmarked operations
  const resolved = {
    resources: resources,
    unassociatedOperations: getUnassociatedOperations(program).filter(
      (op) => !isArmResourceOperation(program, op.operation),
    ),
  };

  program.stateMap(ArmStateKeys.armResolvedResources).set(provider, resolved);

  return resolved;
}

function isVariableSegment(segment: string): boolean {
  return (segment.startsWith("{") && segment.endsWith("}")) || segment === "default";
}

function getResourceInfo(
  program: Program,
  operation: ArmResourceOperation,
): ResolvedOperationResourceInfo | undefined {
  return getResourcePathElements(operation.httpOperation.path, operation.kind);
}

export function getResourcePathElements(
  path: string,
  kind: ArmOperationKind,
): ResolvedOperationResourceInfo | undefined {
  const segments = path.split("/").filter((s) => s.length > 0);
  const providerIndex = segments.findLastIndex((s) => s === "providers");
  if (providerIndex === -1 || providerIndex === segments.length - 1) return undefined;
  const provider = segments[providerIndex + 1];
  const typeSegments: string[] = [];
  const instanceSegments: string[] = segments.slice(0, providerIndex + 2);
  for (let i = providerIndex + 2; i < segments.length; i += 2) {
    if (isVariableSegment(segments[i])) {
      return undefined;
    }

    if (i + 1 < segments.length && isVariableSegment(segments[i + 1])) {
      typeSegments.push(segments[i]);
      instanceSegments.push(segments[i]);
      instanceSegments.push(segments[i + 1]);
    } else if (i + 1 === segments.length) {
      switch (kind) {
        case "list":
          typeSegments.push(segments[i]);
          instanceSegments.push(segments[i]);
          instanceSegments.push("{name}");
          break;
        default:
          break;
      }
      break;
    }
  }
  if (provider !== undefined && typeSegments.length > 0) {
    return {
      resourceType: {
        provider: provider,
        types: typeSegments,
      },
      resourceInstancePath: `/${instanceSegments.join("/")}`,
    };
  }
  return undefined;
}

function tryAddLifecycleOperation(
  resourceType: ResourceType,
  sourceOperation: ArmResourceOperation,
  targetOperation: ResolvedOperations,
): boolean {
  const pathSegments: string[] = sourceOperation.httpOperation.path.split("/");
  const isInstanceOperation: boolean = !isVariableSegment(pathSegments[pathSegments.length - 1]);
  const isResourceCollectionOperation: boolean =
    !isInstanceOperation &&
    pathSegments[pathSegments.length - 1] === resourceType.types[resourceType.types.length - 1];
  switch (sourceOperation.httpOperation.verb) {
    case "get":
      if (isInstanceOperation) {
        if (targetOperation.operations.lifecycle.read === undefined) {
          targetOperation.operations.lifecycle.read = [];
        }
        targetOperation.operations.lifecycle.read.push(sourceOperation);
        return true;
      }
      if (!isResourceCollectionOperation) {
        targetOperation.operations.actions.push(sourceOperation);
        return true;
      }
      if (targetOperation.operations.lists === undefined) {
        targetOperation.operations.lists = [];
      }
      targetOperation.operations.lists.push(sourceOperation);
      return true;
    case "put":
      if (!isInstanceOperation) {
        return false;
      }
      if (targetOperation.operations.lifecycle.createOrUpdate === undefined) {
        targetOperation.operations.lifecycle.createOrUpdate = [];
      }
      targetOperation.operations.lifecycle.createOrUpdate.push(sourceOperation);
      return true;
    case "patch":
      if (!isInstanceOperation) {
        return false;
      }
      if (targetOperation.operations.lifecycle.update === undefined) {
        targetOperation.operations.lifecycle.update = [];
      }
      targetOperation.operations.lifecycle.update.push(sourceOperation);
      return true;
    case "delete":
      if (!isInstanceOperation) {
        return false;
      }
      if (targetOperation.operations.lifecycle.delete === undefined) {
        targetOperation.operations.lifecycle.delete = [];
      }
      targetOperation.operations.lifecycle.delete.push(sourceOperation);
      return true;
    case "post":
    case "head":
      if (isInstanceOperation) {
        return false;
      }
      if (targetOperation.operations.actions === undefined) {
        targetOperation.operations.actions = [];
      }
      targetOperation.operations.actions.push(sourceOperation);
      return true;
    default:
      return false;
  }
}

function addAssociatedOperation(
  sourceOperation: ArmResourceOperation,
  targetOperation: ResolvedOperations,
): void {
  if (!targetOperation.associatedOperations) {
    targetOperation.associatedOperations = [];
  }
  targetOperation.associatedOperations.push(sourceOperation);
}

export function isResourceOperationMatch(
  source: { resourceType: ResourceType; resourceInstancePath: string },
  target: { resourceType: ResourceType; resourceInstancePath: string },
): boolean {
  if (source.resourceType.provider.toLowerCase() !== target.resourceType.provider.toLowerCase())
    return false;
  if (source.resourceType.types.length !== target.resourceType.types.length) return false;
  for (let i = 0; i < source.resourceType.types.length; i++) {
    if (source.resourceType.types[i].toLowerCase() !== target.resourceType.types[i].toLowerCase())
      return false;
  }
  const sourceSegments = source.resourceInstancePath.split("/");
  const targetSegments = target.resourceInstancePath.split("/");
  if (sourceSegments.length !== targetSegments.length) return false;
  for (let i = 0; i < sourceSegments.length; i++) {
    if (!isVariableSegment(sourceSegments[i])) {
      if (isVariableSegment(targetSegments[i])) {
        return false;
      }
      if (sourceSegments[i].toLowerCase() !== targetSegments[i].toLowerCase()) return false;
    } else if (!isVariableSegment(targetSegments[i])) return false;
  }
  return true;
}

export function getUnassociatedOperations(program: Program): ArmResourceOperation[] {
  return getAllOperations(program)
    .map((op) => getResourceOperation(program, op))
    .filter((op) => op !== undefined) as ArmResourceOperation[];
}

function getResourceOperation(
  program: Program,
  operation: Operation,
): ArmResourceOperation | undefined {
  if (operation.kind !== "Operation") return undefined;
  if (isTemplateDeclaration(operation)) return undefined;
  if (operation.interface === undefined || operation.interface.name === undefined) return undefined;
  const [httpOp, _] = getHttpOperation(program, operation);
  return {
    path: httpOp.path,
    httpOperation: httpOp,
    name: operation.name,
    kind: "other",
    operation: operation,
    operationGroup: operation.interface.name,
  };
}

function isArmResourceOperation(program: Program, operation: Operation): boolean {
  if (operation.kind !== "Operation") return false;
  if (isTemplateDeclaration(operation)) return false;
  return getArmOperationIdentifier(program, operation) !== undefined;
}

function getAllOperations(
  program: Program,
  container?: Namespace | Interface | undefined,
): Operation[] {
  container = container || resolveProviderNamespace(program);
  if (!container) {
    return [];
  }
  const operations: Operation[] = [];
  for (const op of container.operations.values()) {
    if (
      op.kind === "Operation" &&
      !isTemplateDeclaration(op) &&
      !isArmResourceOperation(program, op)
    ) {
      operations.push(op);
    }
  }
  if (container.kind === "Namespace") {
    for (const child of container.namespaces.values()) {
      operations.push(...getAllOperations(program, child));
    }
    for (const iface of container.interfaces.values()) {
      operations.push(...getAllOperations(program, iface));
    }
  }
  return operations;
}

export function resolveArmResourceOperations(
  program: Program,
  resourceType: Model,
): ResolvedOperations[] {
  const resolvedOperations: Set<ResolvedOperations> = new Set<ResolvedOperations>();
  const operations = getArmResourceOperationList(program, resourceType);
  for (const operation of operations) {
    const armOperation: ArmResourceOperation | undefined = getResourceOperation(
      program,
      operation.operation,
    );
    if (armOperation === undefined) continue;
    const resourceInfo = getResourceInfo(program, armOperation);
    if (resourceInfo === undefined) continue;

    // Check if we already have an operation for this resource
    for (const resolvedOp of resolvedOperations) {
      if (isResourceOperationMatch(resourceInfo, resolvedOp)) {
        if (tryAddLifecycleOperation(resourceInfo.resourceType, armOperation, resolvedOp)) {
          continue;
        }
        addAssociatedOperation(armOperation, resolvedOp);
        continue;
      }
    }

    // If we don't have an operation for this resource, create a new one
    const newOperation: ResolvedOperations = {
      resourceType: resourceInfo.resourceType,
      resourceInstancePath: resourceInfo.resourceInstancePath,
      operations: {
        lifecycle: {
          read: undefined,
          createOrUpdate: undefined,
          update: undefined,
          delete: undefined,
        },
        actions: [],
        lists: [],
      },
      associatedOperations: [],
    };
    if (!tryAddLifecycleOperation(resourceInfo.resourceType, armOperation, newOperation)) {
      addAssociatedOperation(armOperation, newOperation);
    }
    resolvedOperations.add(newOperation);
  }
  return [...resolvedOperations.values()].toSorted((a, b) => {
    // Sort by provider, type, then instance path
    if (a.resourceType.types.length < b.resourceType.types.length) return -1;
    if (a.resourceType.types.length > b.resourceType.types.length) return 1;
    const aSegments = a.resourceInstancePath.split("/");
    const bSegments = b.resourceInstancePath.split("/");
    if (aSegments.length < bSegments.length) return -1;
    if (aSegments.length > bSegments.length) return 1;
    if (a.resourceInstancePath.toLowerCase() < b.resourceInstancePath.toLowerCase()) return -1;
    if (a.resourceInstancePath.toLowerCase() > b.resourceInstancePath.toLowerCase()) return 1;
    return 0;
  });
}

export { getArmResource } from "./private.decorators.js";

export function getArmResourceInfo(
  program: Program,
  resourceType: Model,
): ArmResourceDetails | undefined {
  const resourceInfo = getArmResource(program, resourceType);

  if (
    !resourceInfo &&
    resourceType.namespace !== undefined &&
    !isArmLibraryNamespace(program, resourceType.namespace)
  ) {
    reportDiagnostic(program, {
      code: "arm-resource-missing",
      format: { type: resourceType.name },
      target: resourceType,
    });
  }

  return resourceInfo;
}

export function getArmResourceKind(resourceType: Model): ArmResourceKind | undefined {
  if (resourceType.baseModel) {
    const coreType = resourceType.baseModel;
    if (coreType.name.startsWith("TrackedResource")) {
      return "Tracked";
    } else if (coreType.name.startsWith("ProxyResource")) {
      return "Proxy";
    } else if (coreType.name.startsWith("ExtensionResource")) {
      return "Extension";
    }
  }

  return undefined;
}

function getResourceOperationOptions(
  type: ResourceOperationOptions | unknown,
): ResourceOperationOptions {
  const defaultOptions: ResourceOperationOptions = {
    allowStaticRoutes: false,
    omitTags: false,
  };

  const options = type as ResourceOperationOptions;
  if (options === undefined || typeof options !== "object") {
    return defaultOptions;
  }
  return options;
}

/**
 * This decorator is used to identify interfaces containing resource operations.
 * When applied, it marks the interface with the `@autoRoute` decorator so that
 * all of its contained operations will have their routes generated
 * automatically.
 *
 * It also adds a `@tag` decorator bearing the name of the interface so that all
 * of the operations will be grouped based on the interface name in generated
 * clients.
 */
export const $armResourceOperations: ArmResourceOperationsDecorator = (
  context: DecoratorContext,
  interfaceType: Interface,
  resourceOperationsOptions?: ResourceOperationOptions | unknown,
) => {
  const { program } = context;
  const options = getResourceOperationOptions(resourceOperationsOptions);

  if (!options.allowStaticRoutes) {
    // All resource interfaces should use @autoRoute
    context.call($autoRoute, interfaceType);
  }

  if (!options.omitTags) {
    // If no tag is given for the interface, tag it with the interface name
    if (getTags(program, interfaceType).length === 0) {
      context.call($tag, interfaceType, interfaceType.name);
    }
  }
};

/**
 * This decorator is used to mark a resource type as a "singleton", a type with
 * only one instance.  The standard set of resource operations can be applied to
 * such a resource type, they will generate the correct routes and parameter
 * lists.
 */
export const $singleton: SingletonDecorator = (
  context: DecoratorContext,
  resourceType: Model,
  keyValue: string = "default",
) => {
  context.program.stateMap(ArmStateKeys.armSingletonResources).set(resourceType, keyValue);
};

export function isSingletonResource(program: Program, resourceType: Model): boolean {
  return program.stateMap(ArmStateKeys.armSingletonResources).has(resourceType);
}

export function getSingletonResourceKey(program: Program, resourceType: Model): string | undefined {
  return program.stateMap(ArmStateKeys.armSingletonResources).get(resourceType);
}

export enum ResourceBaseType {
  Tenant = "Tenant",
  Subscription = "Subscription",
  Location = "Location",
  ResourceGroup = "ResourceGroup",
  Extension = "Extension",
  BuiltIn = "BuiltIn",
  BuiltInSubscription = "BuiltInSubscription",
  BuiltInResourceGroup = "BuiltInResourceGroup",
}

export const $resourceBaseType: ResourceBaseTypeDecorator = (
  context: DecoratorContext,
  entity: Model,
  baseType: Type,
) => {
  let baseTypeString: string = "";
  if (isNeverType(baseType)) return;
  if (baseType?.kind === "String") baseTypeString = baseType.value;
  setResourceBaseType(context.program, entity, baseTypeString);
};

export const $tenantResource: TenantResourceDecorator = (
  context: DecoratorContext,
  entity: Model,
) => {
  setResourceBaseType(context.program, entity, "Tenant");
};

export const $subscriptionResource: SubscriptionResourceDecorator = (
  context: DecoratorContext,
  entity: Model,
) => {
  setResourceBaseType(context.program, entity, "Subscription");
};

export const $locationResource: LocationResourceDecorator = (
  context: DecoratorContext,
  entity: Model,
) => {
  setResourceBaseType(context.program, entity, "Location");
};

export const $resourceGroupResource: ResourceGroupResourceDecorator = (
  context: DecoratorContext,
  entity: Model,
) => {
  setResourceBaseType(context.program, entity, "ResourceGroup");
};

export const $extensionResource: ExtensionResourceDecorator = (
  context: DecoratorContext,
  entity: Model,
) => {
  setResourceBaseType(context.program, entity, "Extension");
};

export const $armProviderNameValue: ArmProviderNameValueDecorator = (
  context: DecoratorContext,
  entity: Operation,
) => {
  const armProvider = getServiceNamespace(context.program, entity);
  if (armProvider === undefined) return;
  for (const [_, property] of entity.parameters.properties) {
    const segment = getSegment(context.program, property);
    if (segment === "providers" && property.type.kind === "String")
      property.type.value = armProvider;
  }
};

export const $identifiers: IdentifiersDecorator = (
  context: DecoratorContext,
  entity: ModelProperty,
  properties: readonly string[],
) => {
  const { program } = context;
  const { type } = entity;

  if (
    type.kind !== "Model" ||
    !isArrayModelType(program, type) ||
    type.indexer.value.kind !== "Model"
  ) {
    reportDiagnostic(program, {
      code: "decorator-param-wrong-type",
      messageId: "armIdentifiersIncorrectEntity",
      target: entity,
    });
    return;
  }

  context.program.stateMap(ArmStateKeys.armIdentifiers).set(entity, properties);
};

/**
 * This function returns identifiers using the @identifiers decorator
 *
 * @param program The program to process.
 * @param entity The array model type to check.
 * @returns returns list of arm identifiers for the given array model type if any or undefined.
 */
export function getArmIdentifiers(program: Program, entity: ModelProperty): string[] | undefined {
  return program.stateMap(ArmStateKeys.armIdentifiers).get(entity);
}

/**
 * This function returns identifiers using the @key decorator.
 *
 * @param program The program to process.
 * @param entity The array model type to check.
 * @returns returns list of arm identifiers for the given array model type if any or undefined.
 */
export function getArmKeyIdentifiers(
  program: Program,
  entity: ArrayModelType,
): string[] | undefined {
  const value = entity.indexer.value;
  const result: string[] = [];
  if (value.kind === "Model") {
    for (const property of value.properties.values()) {
      const pathToKey = getPathToKey(program, property);
      if (pathToKey !== undefined && !pathToKey.endsWith("/id") && !pathToKey.endsWith("/name")) {
        result.push(property.name + pathToKey);
      } else if (getKeyName(program, property) && !["id", "name"].includes(property.name)) {
        result.push(property.name);
      }
    }

    if (!result.includes("id") && compilerGetProperty(value, "id") !== undefined) {
      result.push("id");
    }
  }

  return result.length > 0 ? result : undefined;
}

function getPathToKey(
  program: Program,
  entity: ModelProperty,
  visited = new Set<ModelProperty>(),
): string | undefined {
  if (entity.type.kind !== "Model") {
    return undefined;
  }
  if (visited.has(entity)) {
    return undefined;
  }
  visited.add(entity);

  for (const property of entity.type.properties.values()) {
    if (property.type.kind !== "Model" && getKeyName(program, property)) {
      return "/" + property.name;
    }
    if (property.type.kind === "Model") {
      const path = getPathToKey(program, property, visited);
      if (path !== undefined) {
        return "/" + property.name + path;
      }
    }
  }
  return undefined;
}

function getServiceNamespace(program: Program, type: Type | undefined): string | undefined {
  if (type === undefined) return undefined;
  switch (type.kind) {
    case "Operation":
      return (
        getServiceNamespace(program, type.namespace) ?? getServiceNamespace(program, type.interface)
      );
    case "Interface":
      return getServiceNamespace(program, type.namespace);
    case "Namespace":
      return (
        getArmProviderNamespace(program, type) ??
        (isGlobalNamespace(program, type)
          ? undefined
          : getServiceNamespace(program, type.namespace))
      );
    default:
      return undefined;
  }
}

export function setResourceBaseType(program: Program, resource: Model, type: string) {
  if (program.stateMap(ArmStateKeys.resourceBaseType).has(resource)) {
    reportDiagnostic(program, {
      code: "arm-resource-duplicate-base-parameter",
      target: resource,
    });
  }

  program.stateMap(ArmStateKeys.resourceBaseType).set(resource, type);
}

export function getResourceBaseType(program: Program, resource: Model): ResourceBaseType {
  const parentTracker = new Set<Model>();
  let parent = getParentResource(program, resource);
  while (parent !== undefined) {
    if (parentTracker.has(parent))
      reportDiagnostic(program, { code: "arm-resource-circular-ancestry", target: resource });
    parentTracker.add(parent);
    resource = parent;
    parent = getParentResource(program, resource);
  }
  const keyValue: string | undefined = program
    .stateMap(ArmStateKeys.resourceBaseType)
    .get(resource);
  return resolveResourceBaseType(keyValue);
}

export function resolveResourceBaseType(type?: string | undefined): ResourceBaseType {
  let resolvedType: ResourceBaseType = ResourceBaseType.ResourceGroup;
  if (type !== undefined) {
    switch (type) {
      case "Tenant":
        resolvedType = ResourceBaseType.Tenant;
        break;
      case "Subscription":
        resolvedType = ResourceBaseType.Subscription;
        break;
      case "Location":
        resolvedType = ResourceBaseType.Location;
        break;
      case "ResourceGroup":
        resolvedType = ResourceBaseType.ResourceGroup;
        break;
      case "Extension":
        resolvedType = ResourceBaseType.Extension;
        break;
      case "BuiltIn":
        resolvedType = ResourceBaseType.BuiltIn;
        break;
      case "BuiltInSubscription":
        resolvedType = ResourceBaseType.BuiltInSubscription;
        break;
      case "BuiltInResourceGroup":
        resolvedType = ResourceBaseType.BuiltInResourceGroup;
        break;
    }
  }
  return resolvedType;
}
