import {
  $key,
  $visibility,
  DecoratorContext,
  Interface,
  Model,
  ModelProperty,
  Operation,
  Program,
  StringLiteral,
  Tuple,
  Type,
  getKeyName,
  getTypeName,
} from "@typespec/compiler";
import { $segment, getSegment } from "@typespec/rest";
import { camelCase } from "change-case";
import pluralize from "pluralize";
import {
  ArmRenameListByOperationDecorator,
  ArmResourceInternalDecorator,
  ArmResourcePropertiesOptionalityDecorator,
  ArmUpdateProviderNamespaceDecorator,
  AssignProviderNameValueDecorator,
  AzureResourceBaseDecorator,
  AzureResourceManagerPrivateDecorators,
  ConditionalClientFlattenDecorator,
  DefaultResourceKeySegmentNameDecorator,
  EnforceConstraintDecorator,
  OmitIfEmptyDecorator,
  ResourceBaseParametersOfDecorator,
  ResourceParameterBaseForDecorator,
} from "../generated-defs/Azure.ResourceManager.Private.js";
import { reportDiagnostic } from "./lib.js";
import { getArmProviderNamespace, isArmLibraryNamespace } from "./namespace.js";
import { armRenameListByOperationInternal } from "./operations.js";
import {
  ArmResourceDetails,
  ResourceBaseType,
  getArmResourceKind,
  getResourceBaseType,
  isArmVirtualResource,
  isCustomAzureResource,
  resolveResourceBaseType,
} from "./resource.js";
import { ArmStateKeys } from "./state.js";

export const namespace = "Azure.ResourceManager.Private";

/** @internal */
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
      if (baseType === constraintType) return;
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
  if (armProviderNamespace) {
    (target.type as StringLiteral).value = armProviderNamespace;
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

        providerParam.type.value = armProviderNamespace;
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
  const { program } = context;

  if (resourceType.namespace && getTypeName(resourceType.namespace) === "Azure.ResourceManager") {
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
  const armProviderNamespace = getArmProviderNamespace(program, resourceType.namespace);
  const armLibraryNamespace = isArmLibraryNamespace(program, resourceType.namespace);
  if (!armProviderNamespace && !armLibraryNamespace) {
    reportDiagnostic(program, { code: "arm-resource-missing-arm-namespace", target: resourceType });
    return;
  }

  // Ensure the resource type has defined a name property that has a segment
  const nameProperty = resourceType.properties.get("name");
  if (!nameProperty) {
    reportDiagnostic(program, { code: "arm-resource-missing-name-property", target: resourceType });
    return;
  }

  // Set the name property to be read only
  context.call($visibility, nameProperty, "read");

  const keyName = getKeyName(program, nameProperty);
  if (!keyName) {
    reportDiagnostic(program, {
      code: "arm-resource-missing-name-key-decorator",
      target: resourceType,
    });
    return;
  }

  const collectionName = getSegment(program, nameProperty);
  if (!collectionName) {
    reportDiagnostic(program, {
      code: "arm-resource-missing-name-segment-decorator",
      target: resourceType,
    });
    return;
  }

  let kind = getArmResourceKind(resourceType);
  if (isArmVirtualResource(program, resourceType)) kind = "Virtual";
  if (isCustomAzureResource(program, resourceType)) kind = "Custom";
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
    armProviderNamespace: armProviderNamespace ?? "",
    operations: {
      lifecycle: {},
      lists: {},
      actions: {},
    },
  };

  program.stateMap(ArmStateKeys.armResources).set(resourceType, armResourceDetails);
};

export function listArmResources(program: Program): ArmResourceDetails[] {
  return [...program.stateMap(ArmStateKeys.armResources).values()];
}

export function getArmResource(
  program: Program,
  resourceType: Model,
): ArmResourceDetails | undefined {
  return program.stateMap(ArmStateKeys.armResources).get(resourceType);
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

/**
 * Please DO NOT USE in RestAPI specs.
 * Internal decorator that deprecated direct usage of `x-ms-client-flatten` OpenAPI extension.
 * It will programatically enabled/disable client flattening with @flattenProperty with autorest
 * emitter flags to maintain compatibility in swagger.
 */
const $conditionalClientFlatten: ConditionalClientFlattenDecorator = (
  context: DecoratorContext,
  entity: ModelProperty,
) => {
  context.program.stateMap(ArmStateKeys.armConditionalClientFlatten).set(entity, true);
};

export function isConditionallyFlattened(program: Program, entity: ModelProperty): boolean {
  const flatten = program.stateMap(ArmStateKeys.armConditionalClientFlatten).get(entity);
  return flatten ?? false;
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

/** @internal */
export const $decorators = {
  "Azure.ResourceManager.Private": {
    resourceBaseParametersOf: $resourceBaseParametersOf,
    resourceParameterBaseFor: $resourceParameterBaseFor,
    azureResourceBase: $azureResourceBase,
    omitIfEmpty: $omitIfEmpty,
    conditionalClientFlatten: $conditionalClientFlatten,
    assignProviderNameValue: $assignProviderNameValue,
    armUpdateProviderNamespace: $armUpdateProviderNamespace,
    armResourceInternal: $armResourceInternal,
    defaultResourceKeySegmentName: $defaultResourceKeySegmentName,
    enforceConstraint: $enforceConstraint,
    armRenameListByOperation: $armRenameListByOperation,
    armResourcePropertiesOptionality: $armResourcePropertiesOptionality,
  } satisfies AzureResourceManagerPrivateDecorators,
};
