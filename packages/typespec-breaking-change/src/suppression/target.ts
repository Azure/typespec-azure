import type { Enum, Interface, Model, Namespace, Program, Type, Union } from "@typespec/compiler";
import { isOperationIdentity, type Finding, type OperationDiffIdentity } from "../types.js";

export interface SuppressionTarget {
  target?: Type;
  path?: string;
  scope: "declaration" | "operation" | "type" | "service";
}

export function composeFullIdentityPath(identity: OperationDiffIdentity): string {
  if (identity.component === "request") {
    return `request.${identity.element}`;
  }
  const statusCode = identity.statusCode ?? "*";
  return `responses.${statusCode}.${identity.element}`;
}

export function isSameVersionRemoval(finding: Finding): boolean {
  if (finding.phase !== "same-version" || finding.diff.headType) {
    return false;
  }

  return (
    finding.diff.kind === "OperationRemoved" ||
    finding.diff.kind.endsWith("Removed") ||
    finding.diff.baseType?.kind === "UnionVariant"
  );
}

export function resolveSameVersionRemovalTarget(
  finding: Finding,
  program: Program,
): SuppressionTarget | undefined {
  if (!isSameVersionRemoval(finding)) {
    return undefined;
  }

  const removedType = finding.diff.baseType;
  const parentAndPath = getRemovedParentAndPath(removedType, finding);
  if (parentAndPath) {
    const target = resolveHeadParent(program, parentAndPath.parent);
    if (target?.node) {
      return { target, path: parentAndPath.path, scope: "declaration" };
    }
  }

  if (finding.diff.kind === "OperationRemoved") {
    return undefined;
  }

  if (finding.diff.operationType && isOperationIdentity(finding.diff.identity)) {
    return {
      target: finding.diff.operationType,
      path: composeFullIdentityPath(finding.diff.identity),
      scope: "operation",
    };
  }

  return undefined;
}

export function resolveSuppressionTarget(finding: Finding): SuppressionTarget {
  if (finding.diff.origin?.type) {
    return {
      target: finding.diff.origin.type,
      scope: "declaration",
    };
  }

  const targetType = finding.diff.headType ?? finding.diff.baseType;
  if (isOperationIdentity(finding.diff.identity) && finding.diff.operationType) {
    const operationIsDirectTarget =
      targetType === finding.diff.operationType || targetType?.kind === "Operation";
    return {
      target: finding.diff.operationType,
      path: operationIsDirectTarget ? undefined : composeFullIdentityPath(finding.diff.identity),
      scope: "operation",
    };
  }

  if (targetType) {
    return {
      target: targetType,
      scope: "type",
    };
  }

  return { scope: "service" };
}

function getRemovedParentAndPath(
  removedType: Type | undefined,
  finding: Finding,
): { parent: Model | Enum | Union | Interface | Namespace; path: string } | undefined {
  if (!removedType) {
    return undefined;
  }

  switch (removedType.kind) {
    case "ModelProperty": {
      return removedType.model ? { parent: removedType.model, path: removedType.name } : undefined;
    }
    case "EnumMember": {
      return removedType.enum ? { parent: removedType.enum, path: removedType.name } : undefined;
    }
    case "UnionVariant": {
      return typeof removedType.name === "string" && removedType.union
        ? { parent: removedType.union, path: removedType.name }
        : undefined;
    }
    case "Operation": {
      if (finding.diff.kind !== "OperationRemoved") {
        return undefined;
      }
      const parent = removedType.interface ?? removedType.namespace;
      return parent ? { parent, path: removedType.name } : undefined;
    }
    default:
      return undefined;
  }
}

function resolveHeadParent(
  program: Program,
  baseParent: Model | Enum | Union | Interface | Namespace,
): Type | undefined {
  if (baseParent.kind === "Namespace") {
    return findMatchingNamespace(program, baseParent);
  }

  if (!baseParent.name) {
    return undefined;
  }

  const headNamespace = findMatchingNamespace(program, baseParent.namespace);
  if (!headNamespace) {
    return undefined;
  }

  switch (baseParent.kind) {
    case "Model":
      return headNamespace.models.get(baseParent.name);
    case "Enum":
      return headNamespace.enums.get(baseParent.name);
    case "Union":
      return headNamespace.unions.get(baseParent.name);
    case "Interface":
      return headNamespace.interfaces.get(baseParent.name);
    default:
      return undefined;
  }
}

function findMatchingNamespace(
  program: Program,
  namespace: Namespace | undefined,
): Namespace | undefined {
  const segments: string[] = [];
  let current = namespace;
  while (current?.name) {
    segments.unshift(current.name);
    current = current.namespace;
  }

  let headNamespace = program.getGlobalNamespaceType();
  for (const segment of segments) {
    const child = headNamespace.namespaces.get(segment);
    if (!child) {
      return undefined;
    }
    headNamespace = child;
  }

  return headNamespace;
}
