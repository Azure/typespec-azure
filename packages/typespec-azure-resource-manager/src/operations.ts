import {
  $doc,
  DecoratorContext,
  getFriendlyName,
  ignoreDiagnostics,
  Model,
  Operation,
  Program,
} from "@typespec/compiler";
import {
  unsafe_mutateSubgraph as mutateSubgraph,
  unsafe_Mutator as Mutator,
  unsafe_MutatorFlow as MutatorFlow,
} from "@typespec/compiler/experimental";
import { useStateMap } from "@typespec/compiler/utils";
import { $route, getHttpOperation, HttpOperation, isPathParam } from "@typespec/http";
import {
  $actionSegment,
  $autoRoute,
  $createsOrReplacesResource,
  $deletesResource,
  $readsResource,
  $updatesResource,
  getActionSegment,
  getParentResource,
  getSegment,
} from "@typespec/rest";
import { pascalCase } from "change-case";
import {
  ArmResourceActionDecorator,
  ArmResourceCollectionActionDecorator,
  ArmResourceCreateOrUpdateDecorator,
  ArmResourceDeleteDecorator,
  ArmResourceListDecorator,
  ArmResourceReadDecorator,
  ArmResourceUpdateDecorator,
} from "../generated-defs/Azure.ResourceManager.js";
import {
  ArmOperationOptions,
  ArmOperationRouteDecorator,
  RenamePathParameterDecorator,
} from "../generated-defs/Azure.ResourceManager.Legacy.js";
import { reportDiagnostic } from "./lib.js";
import { isArmLibraryNamespace } from "./namespace.js";
import {
  getArmResourceInfo,
  getResourceBaseType,
  getResourcePathElements,
  isArmVirtualResource,
  isCustomAzureResource,
  ResourceBaseType,
} from "./resource.js";
import { ArmStateKeys } from "./state.js";

export type ArmLifecycleOperationKind = "read" | "createOrUpdate" | "update" | "delete";
export type ArmOperationKind = ArmLifecycleOperationKind | "list" | "action" | "other";

export interface ArmResourceOperation extends ArmResourceOperationData {
  path: string;
  httpOperation: HttpOperation;
}

export interface ArmLifecycleOperations {
  read?: ArmResourceOperation;
  createOrUpdate?: ArmResourceOperation;
  update?: ArmResourceOperation;
  delete?: ArmResourceOperation;
}

export interface ArmResourceLifecycleOperations {
  read?: ArmResourceOperation[];
  createOrUpdate?: ArmResourceOperation[];
  update?: ArmResourceOperation[];
  delete?: ArmResourceOperation[];
}

export interface ArmResolvedOperationsForResource {
  lifecycle: ArmResourceLifecycleOperations;
  lists: ArmResourceOperation[];
  actions: ArmResourceOperation[];
}

export interface ArmResourceOperations {
  lifecycle: ArmLifecycleOperations;
  lists: { [key: string]: ArmResourceOperation };
  actions: { [key: string]: ArmResourceOperation };
}

interface ArmResourceOperationData {
  name: string;
  kind: ArmOperationKind;
  operation: Operation;
  operationGroup: string;
  resourceModelName: string;
  resourceName?: string;
  resourceKind?: "legacy" | "legacy-extension";
}

/** Identifying information for an arm operation */
export interface ArmOperationIdentifier {
  name: string;
  kind: ArmOperationKind;
  operationGroup: string;
  operation: Operation;
  resource?: Model;
  resourceName?: string;
  resourceKind?: "legacy" | "legacy-extension";
}

export interface ArmLifecycleOperationData {
  read?: ArmResourceOperationData;
  createOrUpdate?: ArmResourceOperationData;
  update?: ArmResourceOperationData;
  delete?: ArmResourceOperationData;
}

export interface ArmResourceOperationsData {
  lifecycle: ArmLifecycleOperationData;
  lists: { [key: string]: ArmResourceOperationData };
  actions: { [key: string]: ArmResourceOperationData };
}

export function getArmResourceOperations(
  program: Program,
  resourceType: Model,
): ArmResourceOperationsData {
  let operations = program.stateMap(ArmStateKeys.armResourceOperations).get(resourceType);
  if (!operations) {
    operations = { lifecycle: {}, lists: {}, actions: {} };
    program.stateMap(ArmStateKeys.armResourceOperations).set(resourceType, operations);
  }

  return operations;
}

function resolveHttpOperations<T extends Record<string, ArmResourceOperationData>>(
  program: Program,
  data: T,
): Record<keyof T, ArmResourceOperation> {
  const result: Record<string, ArmResourceOperation> = {};
  for (const [key, item] of Object.entries(data)) {
    const httpOperation: HttpOperation = ignoreDiagnostics(
      getHttpOperation(program, item.operation),
    );
    result[key] = {
      ...item,
      path: httpOperation.path,
      httpOperation: httpOperation,
      resourceName: getResourceNameForOperation(program, item, httpOperation.path),
    };
  }
  return result as any;
}

export function resolveResourceOperations(
  program: Program,
  resourceType: Model,
): ArmResourceOperations {
  const operations = getArmResourceOperations(program, resourceType);

  // Returned the updated operations object
  return {
    lifecycle: resolveHttpOperations(
      program,
      operations.lifecycle as Record<string, ArmResourceOperationData>,
    ),
    actions: resolveHttpOperations(program, operations.actions),
    lists: resolveHttpOperations(program, operations.lists),
  };
}

function setResourceLifecycleOperation(
  context: DecoratorContext,
  target: Operation,
  resourceType: Model,
  kind: ArmLifecycleOperationKind,
  resourceName?: string,
) {
  // Only register methods from non-templated interface types
  if (
    target.interface === undefined ||
    target.interface.node === undefined ||
    target.interface.node.templateParameters.length > 0
  ) {
    return;
  }

  // We can't resolve the operation path yet so treat the operation as a partial
  // type so that we can fill in the missing details later
  const operations = getArmResourceOperations(context.program, resourceType);
  const resolvedResourceName: string = resourceName ?? resourceType.name;
  const operation: Partial<ArmResourceOperation> = {
    name: target.name,
    kind,
    operation: target,
    operationGroup: target.interface.name,
    resourceName: resolvedResourceName,
  };

  operations.lifecycle[kind] = operation as ArmResourceOperation;
  setArmOperationIdentifier(context.program, target, resourceType, {
    name: target.name,
    kind: kind,
    operation: target,
    operationGroup: target.interface.name,
    resourceModelName: resourceType.name,
    resourceName: resolvedResourceName,
  });
  const operationId: ArmOperationIdentifier = {
    name: target.name,
    kind: kind,
    operation: target,
    operationGroup: target.interface.name,
    resource: resourceType,
    resourceName: resolvedResourceName,
  };
  addArmResourceOperation(context.program, resourceType, operationId);
}

export const [getArmOperationList, setArmOperationList] = useStateMap<
  Model,
  Set<ArmOperationIdentifier>
>(ArmStateKeys.resourceOperationList);

export function getArmResourceOperationList(
  program: Program,
  resourceType: Model,
): Set<ArmOperationIdentifier> {
  let operations = getArmOperationList(program, resourceType);
  if (operations === undefined) {
    operations = new Set<ArmOperationIdentifier>();
    setArmOperationList(program, resourceType, operations);
  }
  return operations;
}

export function addArmResourceOperation(
  program: Program,
  resourceType: Model,
  operationData: ArmOperationIdentifier,
): void {
  const operations = getArmResourceOperationList(program, resourceType);
  operations.add(operationData);
  setArmOperationList(program, resourceType, operations);
}

export const [getArmResourceOperationData, setArmResourceOperationData] = useStateMap<
  Operation,
  ArmResourceOperationData
>(ArmStateKeys.armResourceOperationData);

export function setArmOperationIdentifier(
  program: Program,
  target: Operation,
  resourceType: Model,
  data: ArmResourceOperationData,
): void {
  // Initialize the operations for the resource type if not already done
  if (!getArmResourceOperationData(program, target)) {
    setArmResourceOperationData(program, target, { ...data });
  }
}

export const $armResourceRead: ArmResourceReadDecorator = (
  context: DecoratorContext,
  target: Operation,
  resourceType: Model,
  resourceName?: string,
) => {
  context.call($readsResource, target, resourceType);
  setResourceLifecycleOperation(context, target, resourceType, "read", resourceName);
};

export const $armResourceCreateOrUpdate: ArmResourceCreateOrUpdateDecorator = (
  context: DecoratorContext,
  target: Operation,
  resourceType: Model,
  resourceName?: string,
) => {
  context.call($createsOrReplacesResource, target, resourceType);
  setResourceLifecycleOperation(context, target, resourceType, "createOrUpdate", resourceName);
};

export const $armResourceUpdate: ArmResourceUpdateDecorator = (
  context: DecoratorContext,
  target: Operation,
  resourceType: Model,
  resourceName?: string,
) => {
  context.call($updatesResource, target, resourceType);
  setResourceLifecycleOperation(context, target, resourceType, "update", resourceName);
};

export const $armResourceDelete: ArmResourceDeleteDecorator = (
  context: DecoratorContext,
  target: Operation,
  resourceType: Model,
  resourceName?: string,
) => {
  context.call($deletesResource, target, resourceType);
  setResourceLifecycleOperation(context, target, resourceType, "delete", resourceName);
};

export const $armResourceList: ArmResourceListDecorator = (
  context: DecoratorContext,
  target: Operation,
  resourceType: Model,
  resourceName?: string,
) => {
  // Only register methods from non-templated interface types
  if (
    target.interface === undefined ||
    target.interface.node === undefined ||
    target.interface.node.templateParameters.length > 0
  ) {
    return;
  }

  // We can't resolve the operation path yet so treat the operation as a partial
  // type so that we can fill in the missing details later
  const operations = getArmResourceOperations(context.program, resourceType);
  const resolvedResourceName: string = resourceName ?? resourceType.name;
  const operation: Partial<ArmResourceOperation> = {
    name: target.name,
    kind: "list",
    operation: target,
    operationGroup: target.interface.name,
    resourceName: resolvedResourceName,
  };

  operations.lists[target.name] = operation as ArmResourceOperation;
  const opId: ArmOperationIdentifier = {
    name: target.name,
    kind: "list",
    operation: target,
    operationGroup: target.interface.name,
    resource: resourceType,
    resourceName: resolvedResourceName,
  };
  addArmResourceOperation(context.program, resourceType, opId);
  setArmOperationIdentifier(context.program, target, resourceType, {
    kind: "list",
    name: target.name,
    operation: target,
    operationGroup: target.interface.name,
    resourceModelName: resourceType.name,
    resourceName: resolvedResourceName,
  });
};

export function armRenameListByOperationInternal(
  context: DecoratorContext,
  entity: Operation,
  resourceType: Model,
  parentTypeName?: string,
  parentFriendlyTypeName?: string,
  applyOperationRename?: boolean,
) {
  const { program } = context;
  if (
    parentTypeName === undefined ||
    parentTypeName === "" ||
    parentFriendlyTypeName === undefined ||
    parentFriendlyTypeName === ""
  ) {
    [parentTypeName, parentFriendlyTypeName] = getArmParentName(context.program, resourceType);
  }
  const parentType = getParentResource(program, resourceType);
  if (
    parentType &&
    !isArmVirtualResource(program, parentType) &&
    !isCustomAzureResource(program, parentType)
  ) {
    const parentResourceInfo = getArmResourceInfo(program, parentType);
    if (
      !parentResourceInfo &&
      resourceType.namespace !== undefined &&
      isArmLibraryNamespace(program, resourceType.namespace)
    )
      return;
    if (!parentResourceInfo) {
      reportDiagnostic(program, {
        code: "parent-type",
        messageId: "notResourceType",
        target: resourceType,
        format: { type: resourceType.name, parent: parentType.name },
      });
      return;
    }

    // Make sure the first character of the name is upper-cased
    parentTypeName = parentType.name[0].toUpperCase() + parentType.name.substring(1);
  }

  // Add a formatted doc string too
  context.call(
    $doc,
    entity,
    `List ${resourceType.name} resources by ${
      parentType ? parentTypeName : parentFriendlyTypeName
    }`,
    undefined as any,
  );

  if (applyOperationRename === undefined || applyOperationRename === true) {
    // Set the operation name
    entity.name =
      parentTypeName === "Extension" || parentTypeName === undefined || parentTypeName.length < 1
        ? "list"
        : `listBy${parentTypeName}`;
  }
}

function getArmParentName(program: Program, resource: Model): string[] {
  const parent = getParentResource(program, resource);
  if (parent && (isArmVirtualResource(program, parent) || isCustomAzureResource(program, parent))) {
    const parentName = getFriendlyName(program, parent) ?? parent.name;
    if (parentName === undefined || parentName.length < 2) {
      return ["", ""];
    }
    return [
      parentName,
      parentName.length > 1 ? parentName.charAt(0).toLowerCase() + parentName.substring(1) : "",
    ];
  }
  switch (getResourceBaseType(program, resource)) {
    case ResourceBaseType.Extension:
      return ["Extension", "parent"];
    case ResourceBaseType.Location:
      return ["Location", "location"];
    case ResourceBaseType.Subscription:
      return ["Subscription", "subscription"];
    case ResourceBaseType.Tenant:
      return ["Tenant", "tenant"];
    case ResourceBaseType.ResourceGroup:
    default:
      return ["ResourceGroup", "resource group"];
  }
}

export const $armResourceAction: ArmResourceActionDecorator = (
  context: DecoratorContext,
  target: Operation,
  resourceType: Model,
  resourceName?: string,
) => {
  const { program } = context;

  // Only register methods from non-templated interface types
  if (
    target.interface === undefined ||
    target.interface.node === undefined ||
    target.interface.node.templateParameters.length > 0
  ) {
    return;
  }

  // We can't resolve the operation path yet so treat the operation as a partial
  // type so that we can fill in the missing details later
  const operations = getArmResourceOperations(program, resourceType);
  const resolvedResourceName: string = resourceName ?? resourceType.name;
  const operation: Partial<ArmResourceOperation> = {
    name: target.name,
    kind: "action",
    operation: target,
    operationGroup: target.interface.name,
    resourceName: resolvedResourceName,
  };

  operations.actions[target.name] = operation as ArmResourceOperation;
  const opId: ArmOperationIdentifier = {
    name: target.name,
    kind: "action",
    operation: target,
    operationGroup: target.interface.name,
    resource: resourceType,
    resourceName: resolvedResourceName,
  };
  addArmResourceOperation(program, resourceType, opId);
  setArmOperationIdentifier(context.program, target, resourceType, {
    kind: "action",
    name: target.name,
    operation: target,
    operationGroup: target.interface.name,
    resourceModelName: resourceType.name,
    resourceName: resolvedResourceName,
  });

  const segment = getSegment(program, target) ?? getActionSegment(program, target);
  if (!segment) {
    // Also apply the @actionSegment decorator to the operation
    context.call($actionSegment, target, uncapitalize(target.name));
  }
};

function uncapitalize(name: string): string {
  if (name === "") {
    return name;
  }
  return name[0].toLowerCase() + name.substring(1);
}

export const $armResourceCollectionAction: ArmResourceCollectionActionDecorator = (
  context: DecoratorContext,
  target: Operation,
) => {
  context.program.stateMap(ArmStateKeys.armResourceCollectionAction).set(target, true);
};

export function isArmCollectionAction(program: Program, target: Operation): boolean {
  return program.stateMap(ArmStateKeys.armResourceCollectionAction).get(target) === true;
}

export const $armOperationRoute: ArmOperationRouteDecorator = (
  context: DecoratorContext,
  target: Operation,
  options?: ArmOperationOptions,
) => {
  const route: string | undefined = options?.route;

  if (!route && !options?.useStaticRoute) {
    context.call($autoRoute, target);
    return;
  }
  if (route && route.length > 0) {
    context.call($route, target, route);
  }
};

export function getRouteOptions(program: Program, target: Operation): ArmOperationOptions {
  let options: ArmOperationOptions | undefined = undefined;
  if (target.interface) {
    options = options || program.stateMap(ArmStateKeys.armResourceRoute).get(target.interface);
    if (options) return options;
  }
  if (target.sourceOperation?.interface) {
    options =
      options ||
      program.stateMap(ArmStateKeys.armResourceRoute).get(target.sourceOperation.interface);
  }
  if (target.sourceOperation?.interface?.sourceInterfaces[0]) {
    options =
      options ||
      program
        .stateMap(ArmStateKeys.armResourceRoute)
        .get(target.sourceOperation.interface.sourceInterfaces[0]);
  }

  if (options) return options;
  return {
    useStaticRoute: false,
  };
}

function storeRenamePathParameters(
  program: Program,
  target: Operation,
  sourceName: string,
  targetName: string,
): void {
  let renameMap = program.stateMap(ArmStateKeys.renamePathParameters).get(target);
  if (renameMap === undefined) {
    renameMap = new Map<string, string>();
  }
  renameMap.set(sourceName, targetName);
  program.stateMap(ArmStateKeys.renamePathParameters).set(target, renameMap);
}

function getRenamePathParameter(
  program: Program,
  target: Operation,
  sourceName: string,
  targetName: string,
): boolean {
  const renameMap = program.stateMap(ArmStateKeys.renamePathParameters).get(target);
  if (renameMap === undefined) {
    program.stateMap(ArmStateKeys.renamePathParameters).set(target, new Map<string, string>());
    return false;
  }
  return renameMap.get(sourceName) === targetName;
}

/**
 * Renames a path parameter in an Azure Resource Manager operation.
 * @param context The decorator context.
 * @param target The operation to modify.
 * @param sourceParameterName The name of the parameter to rename.
 * @param targetParameterName The new name for the parameter.
 * @returns
 */
export const $renamePathParameter: RenamePathParameterDecorator = (
  context: DecoratorContext,
  target: Operation,
  sourceParameterName: string,
  targetParameterName: string,
) => {
  const { program } = context;
  if (getRenamePathParameter(program, target, sourceParameterName, targetParameterName)) {
    return;
  }

  const toMutate = target.parameters;
  const existingTarget = toMutate.properties.get(targetParameterName);
  const existingSource = toMutate.properties.get(sourceParameterName);
  if (existingSource === undefined && existingTarget !== undefined) return;
  if (existingTarget !== undefined) {
    reportDiagnostic(context.program, {
      code: "invalid-parameter-rename",
      messageId: "overwrite",
      format: { oldName: sourceParameterName, newName: targetParameterName },
      target: context.decoratorTarget,
    });
    return;
  }
  if (existingSource === undefined) {
    reportDiagnostic(context.program, {
      code: "invalid-parameter-rename",
      messageId: "missing",
      format: { oldName: sourceParameterName },
      target: context.decoratorTarget,
    });
    return;
  }
  if (!isPathParam(program, existingSource)) {
    reportDiagnostic(context.program, {
      code: "invalid-parameter-rename",
      messageId: "notpath",
      format: { oldName: sourceParameterName },
      target: context.decoratorTarget,
    });
    return;
  }

  const mutated = mutateSubgraph(
    program,
    [createParamMutator(sourceParameterName, targetParameterName)],
    toMutate,
  );
  target.parameters = mutated.type as Model;
  storeRenamePathParameters(program, target, sourceParameterName, targetParameterName);
};

function createParamMutator(sourceParameterName: string, targetParameterName: string): Mutator {
  return {
    name: "RenameMutator",
    Model: {
      filter: (m, prog) => {
        const param = m.properties.get(sourceParameterName);
        if (
          m.properties.has(targetParameterName) ||
          param === undefined ||
          !isPathParam(prog, param)
        ) {
          return MutatorFlow.DoNotMutate;
        }
        return MutatorFlow.DoNotRecur;
      },
      mutate: (_, clone) => {
        const param = clone.properties.get(sourceParameterName);
        param!.name = targetParameterName;
        clone.properties.delete(sourceParameterName);
        clone.properties.set(targetParameterName, param!);
        return MutatorFlow.DoNotRecur;
      },
    },
  };
}

export function getDefaultLegacyExtensionResourceName(
  path: string,
  resourceName: string,
  operationKind: ArmOperationKind,
): string {
  const providerIndex = path.lastIndexOf("/providers");
  if (providerIndex > -1 && providerIndex < path.length - 1) {
    const targetPath = path.slice(0, providerIndex);
    const extensionPath = path.slice(providerIndex);
    const extensionInfo = getResourcePathElements(extensionPath, operationKind);
    if (!extensionInfo) return resourceName;
    const extensionName = extensionInfo.resourceType.types.flatMap((t) => pascalCase(t)).join("");
    if (targetPath.length === 0) {
      return extensionName;
    }
    if (targetPath.length === 1) {
      return `${pascalCase(targetPath[0].replaceAll("{", "").replaceAll("}", ""))}${extensionName}`;
    }
    const targetInfo = getResourcePathElements(targetPath, "read");
    if (!targetInfo || targetInfo.resourceType.types.length === 0) return resourceName;
    const types = targetInfo.resourceType.types;
    return `${pascalCase(types[types.length - 1])}${extensionName}`;
  }
  return resourceName;
}

function getDefaultLegacyResourceName(operation: ArmResourceOperationData, httpOp: string): string {
  const pathInfo = getResourcePathElements(httpOp, operation.kind);
  if (pathInfo !== undefined) {
    let types: string[] = pathInfo.resourceType.types;
    if (types.length > 1) {
      types = types.slice(types.length - 2);
    }
    return types.flatMap((t) => pascalCase(t)).join("");
  } else {
    return operation.resourceModelName;
  }
}
export function getResourceNameForOperation(
  program: Program,
  operation: ArmResourceOperationData,
  operationPath: string,
): string | undefined {
  if (operation.resourceName !== undefined && operation.resourceName.length > 0)
    return operation.resourceName;
  if (operation.resourceKind === "legacy-extension") {
    return getDefaultLegacyExtensionResourceName(
      operationPath,
      operation.resourceModelName,
      operation.kind,
    );
  }
  if (operation.resourceKind === "legacy") {
    return getDefaultLegacyResourceName(operation, operationPath);
  }

  return undefined;
}
