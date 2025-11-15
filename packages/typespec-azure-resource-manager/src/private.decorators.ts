import {
  $key,
  addVisibilityModifiers,
  clearVisibilityModifiersForClass,
  DecoratorContext,
  getKeyName,
  getLifecycleVisibilityEnum,
  getNamespaceFullName,
  getTypeName,
  Interface,
  isKey,
  Model,
  ModelProperty,
  Operation,
  Program,
  Scalar,
  sealVisibilityModifiers,
  Tuple,
  Type,
} from "@typespec/compiler";

import { $ } from "@typespec/compiler/typekit";
import { useStateMap } from "@typespec/compiler/utils";
import { $bodyRoot, getHttpOperation } from "@typespec/http";
import {
  $actionSegment,
  $createsOrReplacesResource,
  $deletesResource,
  $listsResource,
  $readsResource,
  $segment,
  $updatesResource,
  getActionSegment,
  getSegment,
} from "@typespec/rest";
import { camelCase } from "change-case";
import pluralize from "pluralize";
import {
  AzureResourceManagerExtensionPrivateDecorators,
  BuiltInResourceDecorator,
  BuiltInResourceGroupResourceDecorator,
  BuiltInSubscriptionResourceDecorator,
} from "../generated-defs/Azure.ResourceManager.Extension.Private.js";
import {
  ArmBodyRootDecorator,
  ArmRenameListByOperationDecorator,
  ArmResourceInternalDecorator,
  ArmResourcePropertiesOptionalityDecorator,
  ArmResourceWithParameterDecorator,
  ArmUpdateProviderNamespaceDecorator,
  AssignProviderNameValueDecorator,
  AssignUniqueProviderNameValueDecorator,
  AzureResourceBaseDecorator,
  AzureResourceManagerPrivateDecorators,
  BuiltInResourceOperationDecorator,
  DefaultResourceKeySegmentNameDecorator,
  EnforceConstraintDecorator,
  ExtensionResourceOperationDecorator,
  LegacyExtensionResourceOperationDecorator,
  LegacyResourceOperationDecorator,
  LegacyTypeDecorator,
  OmitIfEmptyDecorator,
  ResourceBaseParametersOfDecorator,
  ResourceParameterBaseForDecorator,
  ResourceParentTypeDecorator,
} from "../generated-defs/Azure.ResourceManager.Private.js";
import { reportDiagnostic } from "./lib.js";
import { getArmProviderNamespace, isArmLibraryNamespace } from "./namespace.js";
import {
  $armResourceAction,
  $armResourceCheckExistence,
  $armResourceCreateOrUpdate,
  $armResourceDelete,
  $armResourceList,
  $armResourceRead,
  $armResourceUpdate,
  addArmResourceOperation,
  ArmOperationIdentifier,
  armRenameListByOperationInternal,
  ArmResourceOperation,
  getArmResourceOperations,
  setArmOperationIdentifier,
} from "./operations.js";
import {
  ArmResourceDetails,
  ArmResourceKind,
  getArmResourceKind,
  getArmVirtualResourceDetails,
  getResourceBaseType,
  isArmVirtualResource,
  isCustomAzureResource,
  resolveResourceBaseType,
  ResourceBaseType,
  setResourceBaseType,
} from "./resource.js";
import { ArmStateKeys } from "./state.js";

export const namespace = "Azure.ResourceManager.Private";

/** @internal */

const $builtInResource: BuiltInResourceDecorator = (
  context: DecoratorContext,
  resourceType: Model,
) => {
  const { program } = context;

  setResourceBaseType(program, resourceType, ResourceBaseType.BuiltIn);
};

const $builtInSubscriptionResource: BuiltInSubscriptionResourceDecorator = (
  context: DecoratorContext,
  resourceType: Model,
) => {
  const { program } = context;

  setResourceBaseType(program, resourceType, ResourceBaseType.BuiltInSubscription);
};

const $builtInResourceGroupResource: BuiltInResourceGroupResourceDecorator = (
  context: DecoratorContext,
  resourceType: Model,
) => {
  const { program } = context;

  setResourceBaseType(program, resourceType, ResourceBaseType.BuiltInResourceGroup);
};
const $omitIfEmpty: OmitIfEmptyDecorator = (
  context: DecoratorContext,
  entity: Model,
  propertyName: string,
) => {
  const modelProp = getProperty(entity, propertyName);

  if (
    modelProp &&
    modelProp.type.kind === "Model" &&
    !hasProperty(context.program, modelProp.type)
  ) {
    entity.properties.delete(propertyName);
  }
};

function checkAllowedVirtualResource(
  program: Program,
  target: Model | Operation,
  type: Model,
): boolean {
  if (target.kind === "Model") return false;
  if (!isArmVirtualResource(program, type)) return false;
  const [httpOp, _] = getHttpOperation(program, target);
  if (httpOp === undefined) return false;
  const method = httpOp.verb;
  switch (method) {
    case "post":
    case "delete":
      return true;
    default:
      return true;
  }
}

function isBuiltIn(baseType: ResourceBaseType): boolean {
  return (
    baseType === ResourceBaseType.BuiltIn ||
    baseType === ResourceBaseType.BuiltInSubscription ||
    baseType === ResourceBaseType.BuiltInResourceGroup
  );
}
const $enforceConstraint: EnforceConstraintDecorator = (
  context: DecoratorContext,
  entity: Operation | Model,
  sourceType: Model,
  constraintType: Model,
) => {
  if (sourceType !== undefined && constraintType !== undefined) {
    // walk the baseModel chain until find a match or fail
    let baseType: Model | undefined = sourceType;
    do {
      if (
        baseType === constraintType ||
        isCustomAzureResource(context.program, baseType) ||
        isBuiltIn(getResourceBaseType(context.program, baseType)) ||
        checkAllowedVirtualResource(context.program, entity, baseType)
      )
        return;
    } while ((baseType = baseType.baseModel) !== undefined);

    reportDiagnostic(context.program, {
      code: "template-type-constraint-no-met",
      target: entity,
      format: {
        entity: entity.name,
        sourceType: sourceType.name,
        constraintType: constraintType.name,
        actionMessage: `Please use the "TrackedResource", "ProxyResource", or "ExtensionResource" template to define the resource.`,
      },
    });
  }
};

const $resourceBaseParametersOf: ResourceBaseParametersOfDecorator = (
  context: DecoratorContext,
  entity: Model,
  resourceType: Model,
) => {
  const targetResourceBaseType: ResourceBaseType = getResourceBaseType(
    context.program,
    resourceType,
  );
  const removedProperties: string[] = [];
  for (const [propertyName, property] of entity.properties) {
    if (!isResourceParameterBaseForInternal(context.program, property, targetResourceBaseType))
      removedProperties.push(propertyName);
  }

  for (const removedProperty of removedProperties) {
    entity.properties.delete(removedProperty);
  }
};

const $resourceParameterBaseFor: ResourceParameterBaseForDecorator = (
  context: DecoratorContext,
  entity: ModelProperty,
  values: Type,
) => {
  const resolvedValues: string[] = [];
  // TODO this will crash if passed anything other than a tuple
  for (const value of (values as Tuple).values) {
    if (value.kind !== "EnumMember") {
      return;
    }
    resolvedValues.push(value.name);
  }
  context.program.stateMap(ArmStateKeys.armResourceCollection).set(entity, resolvedValues);
};

const $defaultResourceKeySegmentName: DefaultResourceKeySegmentNameDecorator = (
  context: DecoratorContext,
  entity: ModelProperty,
  resource: Model,
  keyName: string,
  segment: string,
) => {
  const modelName = camelCase(resource.name);
  const pluralName = pluralize(modelName);
  if (keyName.length > 0) {
    context.call($key, entity, keyName);
  } else {
    context.call($key, entity, `${modelName}Name`);
  }
  if (segment.length > 0) {
    context.call($segment, entity, segment);
  } else {
    context.call($segment, entity, pluralName);
  }
};

export function getResourceParameterBases(
  program: Program,
  property: ModelProperty,
): string[] | undefined {
  return program.stateMap(ArmStateKeys.armResourceCollection).get(property);
}

export function isResourceParameterBaseFor(
  program: Program,
  property: ModelProperty,
  resourceBaseType: string,
): boolean {
  return isResourceParameterBaseForInternal(
    program,
    property,
    resolveResourceBaseType(resourceBaseType),
  );
}

function isResourceParameterBaseForInternal(
  program: Program,
  property: ModelProperty,
  resolvedBaseType: ResourceBaseType,
): boolean {
  const resourceBases = getResourceParameterBases(program, property);
  if (resourceBases !== undefined) {
    for (const rawType of resourceBases) {
      if (resolveResourceBaseType(rawType) === resolvedBaseType) return true;
    }
  }
  return false;
}

/**
 * This decorator dynamically assigns the serviceNamespace from the containing
 * namespace to the string literal value of the path parameter to which this
 * decorator is applied.  Its purpose is to dynamically insert the provider
 * namespace (e.g. 'Microsoft.CodeSigning') into the path parameter list.
 * @param {DecoratorContext} context DecoratorContext
 * @param {Type} target Target of this decorator. Must be a string `ModelProperty`.
 * @param {Type} resourceType Must be a `Model`.
 */
const $assignProviderNameValue: AssignProviderNameValueDecorator = (
  context: DecoratorContext,
  target: ModelProperty,
  resourceType: Model,
) => {
  const { program } = context;
  const armProviderNamespace = getArmProviderNamespace(program, resourceType as Model);
  if (
    armProviderNamespace &&
    target.type.kind === "String" &&
    target.type.value === "Microsoft.ThisWillBeReplaced"
  ) {
    target.type.value = armProviderNamespace;
  }
};

/**
 * This decorator allows setting a unique provider name value, for scenarios in which
 * multiple providers are allowed.
 * @param {DecoratorContext} context DecoratorContext
 * @param {Type} target Target of this decorator. Must be a string `ModelProperty`.
 * @param {Type} resourceType Must be a `Model`.
 */
const $assignUniqueProviderNameValue: AssignUniqueProviderNameValueDecorator = (
  context: DecoratorContext,
  target: ModelProperty,
  resourceType: Model,
) => {
  const { program } = context;
  const armProviderNamespace = getArmProviderNamespace(program, resourceType);
  if (!armProviderNamespace && !isBuiltIn(getResourceBaseType(program, resourceType))) {
    reportDiagnostic(program, {
      code: "resource-without-provider-namespace",
      format: { resourceName: resourceType.name },
      target: resourceType,
    });
    return;
  }
  if (
    armProviderNamespace &&
    target.type.kind === "String" &&
    target.type.value !== armProviderNamespace
  ) {
    target.type = $(program).literal.createString(armProviderNamespace);
  }
};

/**
 * Update the ARM provider namespace for a given entity.
 * @param {DecoratorContext} context DecoratorContext
 * @param {Type} entity Entity to set namespace. Must be a `Operation`.
 * @returns
 */
const $armUpdateProviderNamespace: ArmUpdateProviderNamespaceDecorator = (
  context: DecoratorContext,
  entity: Operation,
) => {
  const { program } = context;

  const operation = entity as Operation;
  const opInterface = operation.interface;
  if (opInterface && opInterface.namespace) {
    const armProviderNamespace = getArmProviderNamespace(program, opInterface.namespace);
    if (armProviderNamespace) {
      // Set the namespace constant on the 'provider' parameter
      const providerParam = operation.parameters.properties.get("provider");
      if (providerParam) {
        if (providerParam.type.kind !== "String") {
          reportDiagnostic(program, {
            code: "decorator-param-wrong-type",
            messageId: "armUpdateProviderNamespace",
            target: providerParam,
          });
          return;
        }
        if (providerParam.type.value === "Microsoft.ThisWillBeReplaced") {
          providerParam.type.value = armProviderNamespace;
        }
      }
    }
  }
};

/**
 * Check if an interface is extending the Azure.ResourceManager.Operations interface.
 */
export function isArmOperationsListInterface(program: Program, type: Interface): boolean {
  if (type.name !== "Operations") {
    return false;
  }
  const listOperation = type.operations.get("list");
  if (listOperation) {
    if (getSegment(program, listOperation) === "operations") {
      return true;
    }
  }
  return false;
}

/**
 * This decorator is used to identify ARM resource types and extract their
 * metadata.  It is *not* meant to be used directly by a spec author, it instead
 * gets implicitly applied when the spec author defines a model type in this form:
 *
 *   `model Server is TrackedResource<ServerProperties>;`
 *
 * The `TrackedResource<T>` type (and other associated base types) use the @armResource
 * decorator, so it also gets applied to the type which absorbs the `TrackedResource<T>`
 * definition by using the `is` keyword.
 */
const $armResourceInternal: ArmResourceInternalDecorator = (
  context: DecoratorContext,
  resourceType: Model,
  propertiesType: Model,
) => {
  registerArmResource(context, resourceType);
};

const $armResourceWithParameter: ArmResourceWithParameterDecorator = (
  context: DecoratorContext,
  target: Model,
  properties: Model,
  type: string,
  nameParameter: string,
) => {
  registerArmResource(context, target, type, nameParameter);
};

function getPrimaryKeyProperty(program: Program, resource: Model): ModelProperty | undefined {
  const nameProperty = resource.properties.get("name");
  if (nameProperty !== undefined) return nameProperty;
  const keyProps = [...resource.properties.values()].filter((prop) => isKey(program, prop));
  if (keyProps.length !== 1) return undefined;
  return keyProps[0];
}

export function registerArmResource(
  context: DecoratorContext,
  resourceType: Model,
  type?: string,
  nameParameter?: string,
): void {
  const { program } = context;
  const namespaceName = resourceType.namespace ? getTypeName(resourceType.namespace) : undefined;
  if (
    namespaceName === undefined ||
    namespaceName === "Azure.ResourceManager" ||
    namespaceName === "Azure.ResourceManager.Legacy"
  ) {
    // The @armResource decorator will be evaluated on instantiations of
    // base templated resource types like TrackedResource<SomeResource>,
    // so ignore in that case.
    return;
  }

  // The global namespace has an empty string as name
  if (!resourceType.namespace || resourceType.namespace.name === "") {
    reportDiagnostic(program, {
      code: "decorator-in-namespace",
      format: { decoratorName: "armResource" },
      target: resourceType,
    });
    return;
  }

  // Locate the ARM namespace in the namespace hierarchy
  const armProviderNamespace = getArmProviderNamespace(program, resourceType);
  const armLibraryNamespace = isArmLibraryNamespace(program, resourceType.namespace);
  const armExternalNamespace = getArmVirtualResourceDetails(program, resourceType)?.provider;
  if (!armProviderNamespace && !armLibraryNamespace && armExternalNamespace === undefined) {
    reportDiagnostic(program, { code: "arm-resource-missing-arm-namespace", target: resourceType });
    return;
  }

  let keyName: string | undefined = undefined;
  let collectionName: string | undefined = undefined;
  let kind: ArmResourceKind | undefined = undefined;

  if (type !== undefined && nameParameter !== undefined) {
    keyName = nameParameter;
    collectionName = type;
    kind = "Proxy";
  } else {
    // Ensure the resource type has defined a name property that has a segment
    const primaryKeyProperty = getPrimaryKeyProperty(program, resourceType);
    if (!primaryKeyProperty) {
      reportDiagnostic(program, {
        code: "arm-resource-missing-name-property",
        target: resourceType,
      });
      return;
    }

    // Set the name property to be read only
    if (primaryKeyProperty.name === "name") {
      const Lifecycle = getLifecycleVisibilityEnum(program);
      clearVisibilityModifiersForClass(program, primaryKeyProperty, Lifecycle, context);
      addVisibilityModifiers(
        program,
        primaryKeyProperty,
        [Lifecycle.members.get("Read")!],
        context,
      );
      sealVisibilityModifiers(program, primaryKeyProperty, Lifecycle);
    }

    keyName = getKeyName(program, primaryKeyProperty);
    if (!keyName) {
      reportDiagnostic(program, {
        code: "arm-resource-missing-name-key-decorator",
        target: resourceType,
      });
      return;
    }

    collectionName = getSegment(program, primaryKeyProperty);
    if (!collectionName) {
      reportDiagnostic(program, {
        code: "arm-resource-missing-name-segment-decorator",
        target: resourceType,
      });
      return;
    }

    kind = getArmResourceKind(resourceType);
    if (isArmVirtualResource(program, resourceType)) kind = "Virtual";
    if (isCustomAzureResource(program, resourceType)) kind = "Custom";
  }
  if (!kind) {
    reportDiagnostic(program, {
      code: "arm-resource-invalid-base-type",
      target: resourceType,
    });

    return;
  }

  const armResourceDetails: ArmResourceDetails = {
    name: resourceType.name,
    kind,
    typespecType: resourceType,
    collectionName,
    keyName,
    armProviderNamespace: armProviderNamespace ?? armExternalNamespace ?? "",
    operations: {
      lifecycle: {},
      lists: {},
      actions: {},
    },
  };

  setArmResource(context.program, resourceType, armResourceDetails);
}

const [getArmResource, setArmResource, armResourceStateMap] = useStateMap<
  Model,
  ArmResourceDetails
>(ArmStateKeys.armResources);

export { getArmResource };

export function listArmResources(program: Program): ArmResourceDetails[] {
  return [...armResourceStateMap(program).values()];
}

function getProperty(model: Model, propertyName: string): ModelProperty | undefined {
  let returnProperty = model.properties?.get(propertyName);
  if (!returnProperty && model.baseModel) {
    returnProperty = getProperty(model.baseModel, propertyName);
  }

  return returnProperty;
}

function hasProperty(program: Program, model: Model): boolean {
  if (model.properties.size > 0) return true;
  if (model.baseModel) return hasProperty(program, model.baseModel);
  return false;
}

const $azureResourceBase: AzureResourceBaseDecorator = (
  context: DecoratorContext,
  resourceType: Model,
) => {
  context.program.stateMap(ArmStateKeys.azureResourceBase).set(resourceType, true);
};

export function isAzureResource(program: Program, resourceType: Model): boolean {
  const isResourceBase = program.stateMap(ArmStateKeys.azureResourceBase).get(resourceType);
  return isResourceBase ?? false;
}

const $armRenameListByOperation: ArmRenameListByOperationDecorator = (
  context: DecoratorContext,
  entity: Operation,
  resourceType: Model,
  parentTypeName?: string,
  parentFriendlyTypeName?: string,
  applyOperationRename?: boolean,
) => {
  armRenameListByOperationInternal(
    context,
    entity,
    resourceType,
    parentTypeName,
    parentFriendlyTypeName,
    applyOperationRename,
  );
};

const $armResourcePropertiesOptionality: ArmResourcePropertiesOptionalityDecorator = (
  context: DecoratorContext,
  target: ModelProperty,
  isOptional: boolean,
) => {
  if (target.name === "properties") {
    target.optional = isOptional;
  }
};

const $armBodyRoot: ArmBodyRootDecorator = (
  context: DecoratorContext,
  target: ModelProperty,
  isOptional: boolean,
) => {
  target.optional = isOptional;
  context.call($bodyRoot, target);
};

const $legacyType: LegacyTypeDecorator = (
  context: DecoratorContext,
  target: Model | Operation | Interface | Scalar,
) => {
  const { program } = context;
  if (
    target.namespace &&
    getNamespaceFullName(target.namespace).startsWith("Azure.ResourceManager")
  ) {
    return;
  }
  reportDiagnostic(program, { code: "legacy-type-usage", target });
};

const $resourceParentType: ResourceParentTypeDecorator = (
  context: DecoratorContext,
  target: Model,
  parentType: "Subscription" | "ResourceGroup" | "Tenant" | "Extension",
) => {
  const { program } = context;
  setResourceBaseType(program, target, parentType);
};
function callOperationDecorator(
  context: DecoratorContext,
  target: Operation,
  resourceType: Model,
  resourceName: string,
  operationType:
    | "read"
    | "createOrUpdate"
    | "update"
    | "delete"
    | "list"
    | "action"
    | "checkExistence",
): void {
  switch (operationType) {
    case "read":
      context.call($armResourceRead, target, resourceType, resourceName);
      break;
    case "createOrUpdate":
      context.call($armResourceCreateOrUpdate, target, resourceType, resourceName);
      break;
    case "update":
      context.call($armResourceUpdate, target, resourceType, resourceName);
      break;
    case "delete":
      context.call($armResourceDelete, target, resourceType, resourceName);
      break;
    case "list":
      context.call($armResourceList, target, resourceType, resourceName);
      break;
    case "action":
      context.call($armResourceAction, target, resourceType, resourceName);
      break;
    case "checkExistence":
      context.call($armResourceCheckExistence, target, resourceType, resourceName);
      break;
  }
}

function callLifecycleDecorator(
  context: DecoratorContext,
  target: Operation,
  resourceType: Model,
  operationType:
    | "read"
    | "createOrUpdate"
    | "update"
    | "delete"
    | "list"
    | "action"
    | "checkExistence",
): void {
  switch (operationType) {
    case "read":
      context.call($readsResource, target, resourceType);
      break;
    case "createOrUpdate":
      context.call($createsOrReplacesResource, target, resourceType);
      break;
    case "update":
      context.call($updatesResource, target, resourceType);
      break;
    case "delete":
      context.call($deletesResource, target, resourceType);
      break;
    case "list":
      context.call($listsResource, target, resourceType);
      break;
    case "checkExistence":
      context.call($armResourceCheckExistence, target, resourceType);
      break;
  }
}

const $extensionResourceOperation: ExtensionResourceOperationDecorator = (
  context: DecoratorContext,
  target: Operation,
  targetResourceType: Model,
  extensionResourceType: Model,
  operationType:
    | "read"
    | "createOrUpdate"
    | "update"
    | "delete"
    | "list"
    | "action"
    | "checkExistence",
  resourceName?: string,
) => {
  if (
    target.interface === undefined ||
    target.interface.node === undefined ||
    target.interface.node.templateParameters.length > 0
  ) {
    return;
  }
  const resolvedResourceName =
    resourceName === undefined || resourceName.length === 0
      ? `${targetResourceType.name}${extensionResourceType.name}`
      : resourceName;
  callOperationDecorator(
    context,
    target,
    extensionResourceType,
    resolvedResourceName,
    operationType,
  );
};

const $builtInResourceOperation: BuiltInResourceOperationDecorator = (
  context: DecoratorContext,
  target: Operation,
  parentResourceType: Model,
  builtInResourceType: Model,
  operationType:
    | "read"
    | "createOrUpdate"
    | "update"
    | "delete"
    | "list"
    | "action"
    | "checkExistence",
  resourceName?: string,
) => {
  if (
    target.interface === undefined ||
    target.interface.node === undefined ||
    target.interface.node.templateParameters.length > 0
  ) {
    return;
  }
  const resolvedResourceName =
    resourceName === undefined || resourceName.length === 0
      ? `${parentResourceType.name}${builtInResourceType.name}`
      : resourceName;
  callOperationDecorator(context, target, builtInResourceType, resolvedResourceName, operationType);
};

const $legacyResourceOperation: LegacyResourceOperationDecorator = (
  context: DecoratorContext,
  target: Operation,
  resourceType: Model,
  operationType:
    | "read"
    | "createOrUpdate"
    | "update"
    | "delete"
    | "list"
    | "action"
    | "checkExistence",
  resourceName?: string,
) => {
  if (
    target.interface === undefined ||
    target.interface.node === undefined ||
    target.interface.node.templateParameters.length > 0
  ) {
    return;
  }
  const resolvedResourceName =
    resourceName !== undefined && resourceName.length > 0 ? resourceName : undefined;
  // We can't resolve the operation path yet so treat the operation as a partial
  // type so that we can fill in the missing details later
  const operations = getArmResourceOperations(context.program, resourceType);
  const operation: Partial<ArmResourceOperation> = {
    name: target.name,
    kind: operationType,
    operation: target,
    operationGroup: target.interface.name,
    resourceName: resolvedResourceName,
    resourceModelName: resourceType.name,
    resourceKind: "legacy",
  };

  operations.lists[target.name] = operation as ArmResourceOperation;
  const opId: ArmOperationIdentifier = {
    name: target.name,
    kind: operationType,
    operation: target,
    operationGroup: target.interface.name,
    resource: resourceType,
    resourceName: resolvedResourceName,
    resourceKind: "legacy",
  };
  addArmResourceOperation(context.program, resourceType, opId);
  setArmOperationIdentifier(context.program, target, resourceType, {
    kind: operationType,
    name: target.name,
    operation: target,
    operationGroup: target.interface.name,
    resourceModelName: resourceType.name,
    resourceName: resolvedResourceName,
    resourceKind: "legacy",
  });

  const { program } = context;
  callLifecycleDecorator(context, target, resourceType, operationType);
  if (operationType === "action") {
    const segment = getSegment(program, target) ?? getActionSegment(program, target);
    if (!segment) {
      // Also apply the @actionSegment decorator to the operation
      context.call($actionSegment, target, uncapitalize(target.name));
    }
  }
};

function uncapitalize(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

const $legacyExtensionResourceOperation: LegacyExtensionResourceOperationDecorator = (
  context: DecoratorContext,
  target: Operation,
  resourceType: Model,
  operationType:
    | "read"
    | "createOrUpdate"
    | "update"
    | "delete"
    | "list"
    | "action"
    | "checkExistence",
  resourceName?: string,
) => {
  if (
    target.interface === undefined ||
    target.interface.node === undefined ||
    target.interface.node.templateParameters.length > 0
  ) {
    return;
  }
  const resolvedResourceName =
    resourceName !== undefined && resourceName.length > 0 ? resourceName : undefined;
  // We can't resolve the operation path yet so treat the operation as a partial
  // type so that we can fill in the missing details later
  const operations = getArmResourceOperations(context.program, resourceType);
  const operation: Partial<ArmResourceOperation> = {
    name: target.name,
    kind: operationType,
    operation: target,
    operationGroup: target.interface.name,
    resourceName: resolvedResourceName,
    resourceModelName: resourceType.name,
    resourceKind: "legacy-extension",
  };

  operations.lists[target.name] = operation as ArmResourceOperation;
  const opId: ArmOperationIdentifier = {
    name: target.name,
    kind: operationType,
    operation: target,
    operationGroup: target.interface.name,
    resource: resourceType,
    resourceName: resolvedResourceName,
    resourceKind: "legacy-extension",
  };
  addArmResourceOperation(context.program, resourceType, opId);
  setArmOperationIdentifier(context.program, target, resourceType, {
    kind: operationType,
    name: target.name,
    operation: target,
    operationGroup: target.interface.name,
    resourceModelName: resourceType.name,
    resourceName: resolvedResourceName,
    resourceKind: "legacy-extension",
  });
  const { program } = context;
  callLifecycleDecorator(context, target, resourceType, operationType);
  if (operationType === "action") {
    const segment = getSegment(program, target) ?? getActionSegment(program, target);
    if (!segment) {
      // Also apply the @actionSegment decorator to the operation
      context.call($actionSegment, target, uncapitalize(target.name));
    }
  }
};

/** @internal */
export const $decorators = {
  "Azure.ResourceManager.Private": {
    resourceBaseParametersOf: $resourceBaseParametersOf,
    resourceParameterBaseFor: $resourceParameterBaseFor,
    azureResourceBase: $azureResourceBase,
    omitIfEmpty: $omitIfEmpty,
    assignUniqueProviderNameValue: $assignUniqueProviderNameValue,
    assignProviderNameValue: $assignProviderNameValue,
    armUpdateProviderNamespace: $armUpdateProviderNamespace,
    armResourceInternal: $armResourceInternal,
    defaultResourceKeySegmentName: $defaultResourceKeySegmentName,
    enforceConstraint: $enforceConstraint,
    armRenameListByOperation: $armRenameListByOperation,
    armResourcePropertiesOptionality: $armResourcePropertiesOptionality,
    armBodyRoot: $armBodyRoot,
    armResourceWithParameter: $armResourceWithParameter,
    legacyType: $legacyType,
    resourceParentType: $resourceParentType,
    extensionResourceOperation: $extensionResourceOperation,
    legacyExtensionResourceOperation: $legacyExtensionResourceOperation,
    legacyResourceOperation: $legacyResourceOperation,
    builtInResourceOperation: $builtInResourceOperation,
  } satisfies AzureResourceManagerPrivateDecorators,
  "Azure.ResourceManager.Extension.Private": {
    builtInResource: $builtInResource,
    builtInSubscriptionResource: $builtInSubscriptionResource,
    builtInResourceGroupResource: $builtInResourceGroupResource,
  } satisfies AzureResourceManagerExtensionPrivateDecorators,
};
