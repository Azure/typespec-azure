import type { Model, Operation } from "@typespec/compiler";
import { useStateMap } from "@typespec/compiler/utils";
import { pascalCase } from "change-case";
import { parseArmResourceInstancePath } from "./resource.js";
import { ArmStateKeys } from "./state.js";

export type ResourceNameExpression =
  | { kind: "explicit"; value: string }
  | { kind: "literal"; value: string }
  | { kind: "model"; model: Model }
  | { kind: "concat"; parts: readonly ResourceNameExpression[] }
  | { kind: "legacy-resource"; model: Model }
  | { kind: "legacy-extension"; model: Model };

export const [getResourceNameExpression, setResourceNameExpression] = useStateMap<
  Operation,
  ResourceNameExpression
>(ArmStateKeys.armResourceNameExpression);

export function getStandardResourceNameExpression(
  resourceType: Model,
  resourceName: string | undefined,
): ResourceNameExpression {
  return resourceName !== undefined && resourceName.length > 0
    ? { kind: "explicit", value: resourceName }
    : { kind: "model", model: resourceType };
}

export function evaluateResourceNameExpression(
  expression: ResourceNameExpression,
  resourceInstancePath: string,
  resolveModelName: (model: Model) => string = (model) => model.name,
): string {
  switch (expression.kind) {
    case "explicit":
    case "literal":
      return expression.value;
    case "model":
      return resolveModelName(expression.model);
    case "concat":
      return expression.parts
        .map((part) => evaluateResourceNameExpression(part, resourceInstancePath, resolveModelName))
        .join("");
    case "legacy-resource":
      return getDefaultLegacyResourceName(resolveModelName(expression.model), resourceInstancePath);
    case "legacy-extension":
      return getDefaultLegacyExtensionResourceName(
        resourceInstancePath,
        resolveModelName(expression.model),
      );
  }
}

export function getResourceNameExpressionModels(
  expression: ResourceNameExpression,
): ReadonlySet<Model> {
  const models = new Set<Model>();
  collect(expression);
  return models;

  function collect(current: ResourceNameExpression): void {
    switch (current.kind) {
      case "model":
      case "legacy-resource":
      case "legacy-extension":
        models.add(current.model);
        return;
      case "concat":
        current.parts.forEach(collect);
        return;
      case "explicit":
      case "literal":
        return;
    }
  }
}

export function getDefaultLegacyExtensionResourceName(path: string, resourceName: string): string {
  const providerIndex = path.lastIndexOf("/providers");
  if (providerIndex > -1 && providerIndex < path.length - 1) {
    const targetPath = path.slice(0, providerIndex);
    const extensionPath = path.slice(providerIndex);
    const extensionInfo = parseArmResourceInstancePath(extensionPath);
    if (!extensionInfo) return resourceName;
    const extensionName = extensionInfo.resourceType.types.flatMap((t) => pascalCase(t)).join("");
    if (targetPath.length === 0) {
      return extensionName;
    }
    if (targetPath.length === 1) {
      return `${pascalCase(targetPath[0].replaceAll("{", "").replaceAll("}", ""))}${extensionName}`;
    }
    const targetInfo = parseArmResourceInstancePath(targetPath);
    if (!targetInfo || targetInfo.resourceType.types.length === 0) return resourceName;
    const types = targetInfo.resourceType.types;
    return `${pascalCase(types[types.length - 1])}${extensionName}`;
  }
  return resourceName;
}

export function getDefaultLegacyResourceName(resourceModelName: string, httpOp: string): string {
  const pathInfo = parseArmResourceInstancePath(httpOp);
  if (pathInfo !== undefined) {
    let types: string[] = pathInfo.resourceType.types;
    if (types.length > 1) {
      types = types.slice(types.length - 2);
    }
    return types.flatMap((t) => pascalCase(t)).join("");
  }
  return resourceModelName;
}
