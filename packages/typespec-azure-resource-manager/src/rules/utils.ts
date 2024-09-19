import {
  DecoratorApplication,
  DecoratorArgument,
  getNamespaceFullName,
  Interface,
  isTemplateDeclaration,
  Model,
  ModelProperty,
  Namespace,
  Operation,
  Program,
  SyntaxKind,
} from "@typespec/compiler";
import { getResourceOperation } from "@typespec/rest";
import { ArmResourceOperation } from "../operations.js";
import { ArmResourceDetails, getArmResourceKind } from "../resource.js";

/**
 *
 *@param target
 *@returns true if the operation is defined on a templated interface which hasn't had args filled in
 */
export function isTemplatedInterfaceOperation(target: Operation) {
  return (
    target.node?.kind === SyntaxKind.OperationStatement &&
    target.interface &&
    isTemplateDeclaration(target.interface)
  );
}

export function isTrackedResource(resourceType: Model) {
  const resultKind = getArmResourceKind(resourceType);
  return resultKind === "Tracked";
}

export function isResource(resourceType: Model) {
  const resultKind = getArmResourceKind(resourceType);
  return !!resultKind;
}

export function isResourceOperation(program: Program, op: Operation) {
  return !!getResourceOperation(program, op);
}

export function getProperties(model: Model) {
  let properties: ModelProperty[] = Array.from(model.properties.values());
  while (model.baseModel) {
    properties = properties.concat(Array.from(model.baseModel.properties.values()));
    model = model.baseModel;
  }
  return properties;
}

export function getInterface(res: ArmResourceDetails) {
  if (res.operations.lifecycle) {
    for (const op of Object.values(res.operations.lifecycle)) {
      const armOperation = op as ArmResourceOperation;
      if (armOperation && armOperation.operation.interface) {
        return armOperation.operation.interface;
      }
    }
  }
  return undefined;
}

export function getSourceModel(property: ModelProperty): Model | undefined {
  let currProperty = property;
  while (currProperty.sourceProperty !== undefined) {
    currProperty = currProperty.sourceProperty;
  }

  return currProperty?.model;
}

export function getSourceProperty(property: ModelProperty): ModelProperty {
  let currProperty = property;
  while (currProperty.sourceProperty !== undefined) {
    currProperty = currProperty.sourceProperty;
  }

  return currProperty ?? property;
}

export function isInternalTypeSpec(
  program: Program,
  type: Model | Operation | ModelProperty | Interface | Namespace,
): boolean {
  const namespace = getNamespaceName(program, type);
  return (
    namespace.startsWith("TypeSpec") ||
    namespace.startsWith("Azure.ResourceManager") ||
    namespace.startsWith("Azure.Core")
  );
}

export function getNamespaceName(
  program: Program,
  type: Model | Operation | ModelProperty | Interface | Namespace | undefined,
): string {
  if (type === undefined) return "";
  if (type.kind === "ModelProperty") return type.model ? getNamespaceName(program, type.model) : "";
  if (type.kind !== "Namespace") type = type.namespace;
  if (type === undefined) return "";
  return getNamespaceFullName(type);
}

export function isValidKey(key: string): boolean {
  const match = key.match(/^[a-z][a-zA-Z0-9-]+$/);
  return match !== undefined && match !== null && match.length === 1;
}

function getDecorator(type: Model | ModelProperty, name: string): DecoratorApplication | undefined {
  const decorator = type.decorators.filter((d) => `$${"name"}` === d.decorator.name);
  if (decorator && decorator.length === 1) return decorator[0];
  return undefined;
}

export function getDecoratorParam(
  type: Model | ModelProperty,
  name: string,
): DecoratorArgument | undefined {
  const call = getDecorator(type, name);
  if (call === undefined) return undefined;
  if (call.args && call.args.length > 2) return call.args[2];
  return undefined;
}
