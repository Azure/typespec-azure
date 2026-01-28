import { getAllProperties } from "@azure-tools/typespec-azure-core";
import {
  $tag,
  ArrayModelType,
  getProperty as compilerGetProperty,
  DecoratorContext,
  Enum,
  EnumMember,
  getKeyName,
  getNamespaceFullName,
  getTags,
  Interface,
  isArrayModelType,
  isGlobalNamespace,
  isNeverType,
  isTemplateDeclaration,
  isTemplateDeclarationOrInstance,
  isTemplateInstance,
  Model,
  ModelProperty,
  Namespace,
  Operation,
  Program,
  Type,
} from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import { getHttpOperation, isPathParam } from "@typespec/http";
import { $autoRoute, getParentResource, getSegment } from "@typespec/rest";

import { camelCase, pascalCase } from "change-case";
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
import {
  ArmExternalTypeDecorator,
  ArmFeatureOptions,
  CustomAzureResourceDecorator,
  CustomResourceOptions,
  FeatureDecorator,
  FeatureOptionsDecorator,
  FeaturesDecorator,
} from "../generated-defs/Azure.ResourceManager.Legacy.js";
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
  getArmResourceOperationData,
  getArmResourceOperationList,
  getResourceNameForOperation,
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

export const [isArmExternalType, setArmExternalType] = useStateMap<Model, boolean>(
  ArmStateKeys.armExternalType,
);

export const $armExternalType: ArmExternalTypeDecorator = (
  context: DecoratorContext,
  entity: Model,
) => {
  const { program } = context;
  if (isTemplateDeclaration(entity)) return;
  setArmExternalType(program, entity, true);
};

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

/** New details for a resolved resource */
export interface ResourceModel {
  /** The model type for the resource */
  type: Model;
  /** The kind of resource (extension | tracked | proxy | custom | virtual | built-in) */
  kind: ArmResourceKind;
  /** The provider namespace */
  providerNamespace: string;
  /** The set of resolved operations for a resource.  For most 
        resources there will be 1 returned record */
  resources?: ResolvedResource[];
}

export interface Provider {
  /** The set of resources in this provider */
  resources?: ResolvedResource[];
  /** non-resource operations in this provider */
  providerOperations?: ArmResourceOperation[];
}

export interface ResourcePathInfo {
  /** The resource type (The actual resource type string will be "${provider}/${types.join("/")}) */
  resourceType: ResourceType;
  /** The path to the instance of a resource */
  resourceInstancePath: string;
}

export interface ResolvedResourceInfo {
  /** The resource type (The actual resource type string will be "${provider}/${types.join("/")}) */
  resourceType: ResourceType;
  /** The path to the instance of a resource */
  resourceInstancePath: string;
  /** The name of the resource at this instance path  */
  resourceName: string;
}

interface ResolvedResourceOperations {
  operations: ArmResolvedOperationsForResource;
  /** Other operations associated with this resource */
  associatedOperations?: ArmResourceOperation[];
  /** The name of the resource at this instance path  */
  resourceName: string;
  /** The resource type (The actual resource type string will be "${provider}/${types.join("/")}) */
  resourceType: ResourceType;
  /** The path to the instance of a resource */
  resourceInstancePath: string;
  /** The parent of this resource */
  parent?: ResolvedResource;
  /** The scope of this resource */
  scope?: string;
}
/** Resolved operations, including operations for non-arm resources */
export interface ResolvedResource {
  /** The model type for the resource */
  type: Model;
  /** The kind of resource (extension | tracked | proxy | custom | virtual | built-in) */
  kind: "Tracked" | "Proxy" | "Extension" | "Other";
  /** The provider namespace */
  providerNamespace: string;
  /** The lifecycle and action operations using this resourceInstancePath (or the parent path) */
  operations: ArmResolvedOperationsForResource;
  /** Other operations associated with this resource */
  associatedOperations?: ArmResourceOperation[];
  /** The name of the resource at this instance path  */
  resourceName: string;
  /** The resource type (The actual resource type string will be "${provider}/${types.join("/")}) */
  resourceType: ResourceType;
  /** The path to the instance of a resource */
  resourceInstancePath: string;
  /** The parent of this resource */
  parent?: ResolvedResource;
  /** The scope of this resource */
  scope?: string | ResolvedResource;
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
  options?: CustomResourceOptions,
) => {
  const { program } = context;
  const optionsValue = options ?? { isAzureResource: false };
  if (isTemplateDeclaration(entity)) return;
  setCustomResource(program, entity, optionsValue);
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

const [getCustomResourceOptions, setCustomResource] = useStateMap<Model, CustomResourceOptions>(
  ArmStateKeys.customAzureResource,
);

export { getCustomResourceOptions };

/**
 * Determine if the given model is a custom resource.
 * @param program The program to process.
 * @param target The model to check.
 * @returns true if the model or any model it extends is marked as a resource, otherwise false.
 */
export function isCustomAzureResource(program: Program, target: Model): boolean {
  const resourceOptions = getCustomResourceOptions(program, target);
  if (resourceOptions) return true;
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

export const [getResolvedResources, setResolvedResources] = useStateMap<Namespace, Provider>(
  ArmStateKeys.armResolvedResources,
);

export function getPublicResourceKind(
  typespecType: Model,
): "Tracked" | "Proxy" | "Extension" | "Other" | undefined {
  const kind = getArmResourceKind(typespecType);
  if (kind === undefined) return "Other";
  switch (kind) {
    case "Tracked":
      return "Tracked";
    case "Proxy":
      return "Proxy";
    case "Extension":
      return "Extension";
    default:
      return "Other";
  }
}

export function resolveArmResources(program: Program): Provider {
  const provider = resolveProviderNamespace(program);
  if (provider === undefined) return {};
  const resolvedResources = getResolvedResources(program, provider);
  if (resolvedResources?.resources !== undefined && resolvedResources.resources.length > 0) {
    // Return the cached resource details
    return resolvedResources;
  }

  // We haven't generated the full resource details yet
  const resources: ResolvedResource[] = [];
  for (const resource of listArmResources(program)) {
    const operations = resolveArmResourceOperations(program, resource.typespecType);
    for (const op of operations) {
      const fullResource: ResolvedResource = {
        ...op,
        type: resource.typespecType,
        kind:
          getPublicResourceKind(resource.typespecType) ??
          (operations.length > 0 ? "Tracked" : "Other"),
        providerNamespace: resource.armProviderNamespace,
      };
      resources.push(fullResource);
    }
  }
  const toProcess = resources.slice();
  while (toProcess.length > 0) {
    const resource = toProcess.shift()!;
    resource.parent = getResourceParent(resources, resource, toProcess);
    resource.scope = getResourceScope(resources, resource, toProcess);
  }

  // Add the unmarked operations
  const resolved: Provider = {
    resources: resources,
    providerOperations: getUnassociatedOperations(program).filter(
      (op) => !isArmResourceOperation(program, op.operation),
    ),
  };

  setResolvedResources(program, provider, resolved);
  return resolved;
}

function getResourceParent(
  knownResources: ResolvedResource[],
  child: ResolvedResource,
  resourcesToProcess: ResolvedResource[],
): ResolvedResource | undefined {
  if (child.resourceType.types.length < 2) return undefined;
  for (const resource of knownResources) {
    if (
      resource.resourceType.types.length + 1 === child.resourceType.types.length &&
      resource.resourceType.provider === child.resourceType.provider &&
      resource.resourceType.types.join("/") === child.resourceType.types.slice(0, -1).join("/")
    ) {
      return resource;
    }
  }
  const parent: ResolvedResource = {
    type: child.type,
    kind: "Other",
    providerNamespace: child.providerNamespace,
    resourceType: {
      provider: child.resourceType.provider,
      types: child.resourceType.types.slice(0, -1),
    },
    resourceName: getParentName(child.resourceType.types[child.resourceType.types.length - 2]),
    resourceInstancePath: `/${child.resourceInstancePath
      .split("/")
      .filter((s) => s.length > 0)
      .slice(0, -2)
      .join("/")}`,
    operations: { lifecycle: {}, actions: [], lists: [] },
  };
  knownResources.push(parent);
  resourcesToProcess.push(parent);
  return parent;
}

function getParentName(typeName: string): string {
  if (typeName.endsWith("s")) {
    typeName = typeName.slice(0, -1);
  }
  return pascalCase(typeName);
}

function getResourceScope(
  knownResources: ResolvedResource[],
  resource: ResolvedResource,
  resourcesToProcess: ResolvedResource[],
): ResolvedResource | string | undefined {
  if (resource.scope !== undefined) return resource.scope;
  if (resource.parent !== undefined)
    return getResourceScope(knownResources, resource.parent, resourcesToProcess);
  const partsIndex = resource.resourceInstancePath.lastIndexOf("/providers");
  if (partsIndex === 0) return "Tenant";

  const segments = resource.resourceInstancePath
    .slice(0, partsIndex)
    .split("/")
    .filter((s) => s.length > 0);
  if (segments.length === 1 && isVariableSegment(segments[0])) return "Scope";
  if (
    segments.length === 2 &&
    isVariableSegment(segments[1]) &&
    segments[0].toLowerCase() === "subscriptions"
  )
    return "Subscription";
  if (
    segments.length === 4 &&
    isVariableSegment(segments[3]) &&
    segments[0].toLowerCase() === "subscriptions" &&
    segments[2].toLowerCase() === "resourcegroups"
  )
    return "ResourceGroup";
  if (
    segments.length === 4 &&
    isVariableSegment(segments[3]) &&
    segments[0].toLowerCase() === "providers" &&
    segments[1].toLowerCase() === "microsoft.management" &&
    segments[2].toLowerCase() === "managementgroups"
  )
    return "ManagementGroup";
  if (segments.some((s) => s.toLowerCase() === "providers")) {
    const parentProviderIndex = segments.findLastIndex((s) => s.toLowerCase() === "providers");
    if (segments.length < parentProviderIndex + 2) {
      return "ExternalResource";
    }
    const provider = segments[parentProviderIndex + 1];
    if (isVariableSegment(provider)) {
      return "ExternalResource";
    }
    const typeSegments: string[] = segments.slice(parentProviderIndex + 2);
    if (typeSegments.length % 2 !== 0) {
      return "ExternalResource";
    }
    const types: string[] = [];
    for (let i = 0; i < typeSegments.length; i++) {
      if (i % 2 === 0) {
        if (isVariableSegment(typeSegments[i])) {
          return "ExternalResource";
        }
        types.push(typeSegments[i]);
      } else if (!isVariableSegment(typeSegments[i])) {
        return "ExternalResource";
      }
    }
    const parent: ResolvedResource = {
      type: resource.type,
      kind: "Other",
      providerNamespace: provider,
      resourceType: {
        provider: provider,
        types: types,
      },
      resourceName: getParentName(types[types.length - 1]),
      resourceInstancePath: `/${segments.join("/")}`,
      operations: { lifecycle: {}, actions: [], lists: [] },
    };
    for (const knownResource of knownResources) {
      if (
        parent.resourceType.provider.toLowerCase() ===
          knownResource.resourceType.provider.toLowerCase() &&
        parent.resourceType.types.flatMap((r) => r.toLowerCase()).join("/") ===
          knownResource.resourceType.types.flatMap((k) => k.toLowerCase()).join("/")
      ) {
        return knownResource;
      }
    }
    knownResources.push(parent);
    resourcesToProcess.push(parent);
    return parent;
  }
  return undefined;
}

function isVariableSegment(segment: string): boolean {
  return (segment.startsWith("{") && segment.endsWith("}")) || segment === "default";
}

function getResourceInfo(
  program: Program,
  operation: ArmResourceOperation,
): ResolvedResourceInfo | undefined {
  const pathInfo = getResourcePathElements(operation.httpOperation.path, operation.kind);
  if (pathInfo === undefined) return undefined;
  return {
    ...pathInfo,
    resourceName: operation.resourceName ?? operation.operationGroup,
  };
}

export function getResourcePathElements(
  path: string,
  kind: ArmOperationKind,
): ResourcePathInfo | undefined {
  const segments = path.split("/").filter((s) => s.length > 0);
  const providerIndex = segments.findLastIndex((s) => s === "providers");
  if (providerIndex === -1 || providerIndex === segments.length - 1) return undefined;
  const provider = segments[providerIndex + 1];
  const typeSegments: string[] = [];
  const instanceSegments: string[] = segments.slice(0, providerIndex + 2);
  for (let i = providerIndex + 2; i < segments.length; i += 2) {
    if (isVariableSegment(segments[i])) {
      break;
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
  targetResource: ResolvedResourceOperations,
): boolean {
  const opType = sourceOperation.kind;
  const operations = targetResource.operations;
  switch (opType) {
    case "read":
      operations.lifecycle.read ??= [];
      addUniqueOperation(sourceOperation, operations.lifecycle.read);
      return true;
    case "createOrUpdate":
      operations.lifecycle.createOrUpdate ??= [];
      addUniqueOperation(sourceOperation, operations.lifecycle.createOrUpdate);
      return true;
    case "update":
      operations.lifecycle.update ??= [];
      addUniqueOperation(sourceOperation, operations.lifecycle.update);
      return true;
    case "delete":
      operations.lifecycle.delete ??= [];
      addUniqueOperation(sourceOperation, operations.lifecycle.delete);
      return true;
    case "list":
      operations.lists ??= [];
      addUniqueOperation(sourceOperation, operations.lists);
      return true;
    case "action":
      operations.actions ??= [];
      addUniqueOperation(sourceOperation, operations.actions);
      return true;
    case "checkExistence":
      operations.lifecycle.checkExistence ??= [];
      addUniqueOperation(sourceOperation, operations.lifecycle.checkExistence);
      return true;
    case "other":
      targetResource.associatedOperations ??= [];
      addUniqueOperation(sourceOperation, targetResource.associatedOperations);
      return true;
  }
  return false;
}

function addAssociatedOperation(
  sourceOperation: ArmResourceOperation,
  targetOperation: ResolvedResourceOperations,
): void {
  targetOperation.associatedOperations ??= [];
  addUniqueOperation(sourceOperation, targetOperation.associatedOperations);
}

export function isResourceOperationMatch(
  source: {
    resourceType: ResourceType;
    resourceInstancePath: string;
    resourceName?: string;
  },
  target: {
    resourceType: ResourceType;
    resourceInstancePath: string;
    resourceName?: string;
  },
): boolean {
  if (
    source.resourceName &&
    target.resourceName &&
    source.resourceName.toLowerCase() !== target.resourceName.toLowerCase()
  )
    return false;
  if (source.resourceType.provider.toLowerCase() !== target.resourceType.provider.toLowerCase())
    return false;
  if (source.resourceType.types.length !== target.resourceType.types.length) return false;
  for (let i = 0; i < source.resourceType.types.length; i++) {
    if (source.resourceType.types[i].toLowerCase() !== target.resourceType.types[i].toLowerCase())
      return false;
  }
  /*const sourceSegments = source.resourceInstancePath.split("/");
  const targetSegments = target.resourceInstancePath.split("/");
  if (sourceSegments.length !== targetSegments.length) return false;
  for (let i = 0; i < sourceSegments.length; i++) {
    if (!isVariableSegment(sourceSegments[i])) {
      if (isVariableSegment(targetSegments[i])) {
        return false;
      }
      if (sourceSegments[i].toLowerCase() !== targetSegments[i].toLowerCase()) return false;
    } else if (!isVariableSegment(targetSegments[i])) return false;
  }*/
  return true;
}

export function getUnassociatedOperations(program: Program): ArmResourceOperation[] {
  return getAllOperations(program)
    .map((op) => getResourceOperation(program, op))
    .filter((op) => op !== undefined) as ArmResourceOperation[];
}

export function getResourceOperation(
  program: Program,
  operation: Operation,
): ArmResourceOperation | undefined {
  if (operation.kind !== "Operation") return undefined;
  if (operation.isFinished === false) return undefined;
  if (isTemplateDeclarationOrInstance(operation) && !isTemplateInstance(operation))
    return undefined;
  if (operation.interface === undefined || operation.interface.name === undefined) return undefined;
  const [httpOp, _] = getHttpOperation(program, operation);
  return {
    path: httpOp.path,
    httpOperation: httpOp,
    name: operation.name,
    kind: "other",
    operation: operation,
    operationGroup: operation.interface.name,
    resourceModelName: "",
  };
}

function isArmResourceOperation(program: Program, operation: Operation): boolean {
  if (operation.kind !== "Operation") return false;
  if (operation.isFinished === false) return false;
  if (isTemplateDeclarationOrInstance(operation) && !isTemplateInstance(operation)) return false;
  return getArmResourceOperationData(program, operation) !== undefined;
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
      op.isFinished &&
      (!isTemplateDeclarationOrInstance(op) || isTemplateInstance(op)) &&
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

function addUniqueOperation(operation: ArmResourceOperation, operations: ArmResourceOperation[]) {
  if (
    !operations.some(
      (op) =>
        op.name.toLowerCase() === operation.name.toLowerCase() &&
        op.operationGroup.toLowerCase() === operation.operationGroup.toLowerCase(),
    )
  ) {
    operations.push(operation);
  }
}

export function resolveArmResourceOperations(
  program: Program,
  resourceType: Model,
): ResolvedResourceOperations[] {
  const resolvedOperations: Set<ResolvedResourceOperations> = new Set<ResolvedResourceOperations>();
  const operations = getArmResourceOperationList(program, resourceType);
  for (const operation of operations) {
    const armOperation: ArmResourceOperation | undefined = getResourceOperation(
      program,
      operation.operation,
    );

    if (armOperation === undefined) continue;
    armOperation.kind = operation.kind;

    armOperation.resourceModelName = operation.resource?.name ?? resourceType.name;
    const resourceInfo = getResourceInfo(program, armOperation);
    if (resourceInfo === undefined) continue;
    armOperation.name = operation.name;
    armOperation.resourceKind = operation.resourceKind;
    resourceInfo.resourceName =
      operation.resourceName ??
      getResourceNameForOperation(program, armOperation, resourceInfo.resourceInstancePath) ??
      armOperation.resourceModelName;
    armOperation.resourceName = resourceInfo.resourceName;

    let matched = false;
    // Check if we already have an operation for this resource
    for (const resolvedOp of resolvedOperations) {
      if (isResourceOperationMatch(resourceInfo, resolvedOp)) {
        matched = true;
        if (tryAddLifecycleOperation(resourceInfo.resourceType, armOperation, resolvedOp)) {
          continue;
        }
        addAssociatedOperation(armOperation, resolvedOp);
        continue;
      }
    }

    if (matched) continue;
    // If we don't have an operation for this resource, create a new one
    const newResource: ResolvedResourceOperations = {
      resourceType: resourceInfo.resourceType,
      resourceInstancePath: resourceInfo.resourceInstancePath,
      resourceName: resourceInfo.resourceName,
      operations: {
        lifecycle: {
          read: undefined,
          createOrUpdate: undefined,
          update: undefined,
          delete: undefined,
          checkExistence: undefined,
        },
        actions: [],
        lists: [],
      },
      associatedOperations: [],
    };
    if (!tryAddLifecycleOperation(resourceInfo.resourceType, armOperation, newResource)) {
      addAssociatedOperation(armOperation, newResource);
    }
    resolvedOperations.add(newResource);
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
    const coreTypeNamespace = coreType.namespace ? getNamespaceFullName(coreType.namespace) : "";
    if (
      coreType.name.startsWith("TrackedResource") ||
      coreType.name.startsWith("LegacyTrackedResource") ||
      (coreTypeNamespace.startsWith("Azure.ResourceManager") &&
        resourceType.properties.has("location") &&
        resourceType.properties.has("tags"))
    ) {
      return "Tracked";
    } else if (coreType.name.startsWith("ProxyResource")) {
      return "Proxy";
    } else if (coreType.name.startsWith("ExtensionResource")) {
      return "Extension";
    } else if (coreTypeNamespace === "Azure.ResourceManager.CommonTypes") {
      return "BuiltIn";
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
  entity: ModelProperty | Type,
  properties: readonly string[],
) => {
  const { program } = context;
  const type = entity.kind === "ModelProperty" ? entity.type : entity;
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
 * This function returns identifiers using the '@identifiers' decorator
 *
 * @param program The program to process.
 * @param entity The array model type to check.
 * @returns returns list of arm identifiers for the given array model type if any or undefined.
 */
export function getArmIdentifiers(
  program: Program,
  entity: ModelProperty | Model,
): string[] | undefined {
  return program.stateMap(ArmStateKeys.armIdentifiers).get(entity);
}

/**
 * This function returns identifiers using the '@key' decorator.
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

export const [getResourceFeature, setResourceFeature] = useStateMap<
  Model | Operation | Interface | Namespace,
  EnumMember
>(ArmStateKeys.armFeature);

export const [getResourceFeatureSet, setResourceFeatureSet] = useStateMap<
  Namespace,
  Map<string, ArmFeatureOptions>
>(ArmStateKeys.armFeatureSet);

export const [getResourceFeatureOptions, setResourceFeatureOptions] = useStateMap<
  EnumMember,
  ArmFeatureOptions
>(ArmStateKeys.armFeatureOptions);

const commonFeatureOptions: ArmFeatureOptions = {
  featureName: "Common",
  fileName: "common",
  description: "",
};
export function getFeatureOptions(program: Program, feature: EnumMember): ArmFeatureOptions {
  const defaultFeatureName: string = (feature.value ?? feature.name) as string;
  const defaultOptions: ArmFeatureOptions = {
    featureName: defaultFeatureName,
    fileName: camelCase(defaultFeatureName),
    description: "",
  };
  return program.stateMap(ArmStateKeys.armFeatureOptions).get(feature) ?? defaultOptions;
}

/**
 * Get the FeatureOptions for a given type, these could be inherited from the namespace or parent type
 * @param program - The program to process.
 * @param entity - The type entity to get feature options for.
 * @returns The ArmFeatureOptions if found, otherwise undefined.
 */
export function getFeature(program: Program, entity: Type): ArmFeatureOptions {
  switch (entity.kind) {
    case "Namespace": {
      const feature = getResourceFeature(program, entity);
      if (feature === undefined) return commonFeatureOptions;
      const options = getFeatureOptions(program, feature);
      return options;
    }
    case "Interface": {
      let feature = getResourceFeature(program, entity);
      if (feature !== undefined) return getFeatureOptions(program, feature);
      const namespace = entity.namespace;
      if (namespace === undefined) return commonFeatureOptions;
      feature = getResourceFeature(program, namespace);
      if (feature === undefined) return commonFeatureOptions;
      return getFeatureOptions(program, feature);
    }
    case "Model": {
      let feature = getResourceFeature(program, entity);
      if (feature !== undefined) return getFeatureOptions(program, feature);
      if (isTemplateInstance(entity)) {
        for (const arg of entity.templateMapper.args) {
          if (arg.entityKind === "Type" && arg.kind === "Model") {
            const options = getFeature(program, arg);
            if (options !== commonFeatureOptions) return options;
          }
        }
      }
      const namespace = entity.namespace;
      if (namespace === undefined) return commonFeatureOptions;
      feature = getResourceFeature(program, namespace);
      if (feature === undefined) return commonFeatureOptions;
      return getFeatureOptions(program, feature);
    }
    case "Operation": {
      const opFeature = getResourceFeature(program, entity);
      if (opFeature !== undefined) return getFeatureOptions(program, opFeature);
      const opInterface = entity.interface;
      if (opInterface !== undefined) {
        return getFeature(program, opInterface);
      }
      const namespace = entity.namespace;
      if (namespace === undefined) return commonFeatureOptions;
      const feature = getResourceFeature(program, namespace);
      if (feature === undefined) return commonFeatureOptions;
      return getFeatureOptions(program, feature);
    }
    case "EnumMember": {
      return getFeature(program, entity.enum);
    }
    case "UnionVariant": {
      return getFeature(program, entity.union);
    }
    case "ModelProperty": {
      if (entity.model === undefined) return commonFeatureOptions;
      return getFeature(program, entity.model);
    }
    case "Enum":
    case "Union":
    case "Scalar": {
      const namespace = entity.namespace;
      if (namespace === undefined) return commonFeatureOptions;
      const feature = getResourceFeature(program, namespace);
      if (feature === undefined) return commonFeatureOptions;
      return getFeatureOptions(program, feature);
    }

    default:
      return commonFeatureOptions;
  }
}

export const $feature: FeatureDecorator = (
  context: DecoratorContext,
  entity: Model | Operation | Interface | Namespace,
  featureName: EnumMember,
) => {
  const { program } = context;
  setResourceFeature(program, entity, featureName);
};

export const $features: FeaturesDecorator = (
  context: DecoratorContext,
  entity: Namespace,
  features: Enum,
) => {
  const { program } = context;
  let featureMap: Map<string, ArmFeatureOptions> | undefined = getResourceFeatureSet(
    program,
    entity,
  );
  if (featureMap !== undefined) {
    return;
  }
  featureMap = new Map<string, ArmFeatureOptions>();

  for (const member of features.members.values()) {
    const options = getFeatureOptions(program, member); // Ensure defaults are created
    featureMap.set(options.featureName, options);
  }
  const common = [...featureMap.keys()].some((k) => k.toLowerCase() === "common");
  if (!common) {
    featureMap.set("Common", commonFeatureOptions);
  }
  setResourceFeatureSet(program, entity, featureMap);
};

export const $featureOptions: FeatureOptionsDecorator = (
  context: DecoratorContext,
  entity: EnumMember,
  options: ArmFeatureOptions,
) => {
  setResourceFeatureOptions(context.program, entity, options);
};
