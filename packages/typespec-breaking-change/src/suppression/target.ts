import type { Namespace, Program, Type } from "@typespec/compiler";
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

export function resolveRemovedOperationTarget(
  finding: Finding,
  program: Program,
): SuppressionTarget | undefined {
  const operation = finding.diff.baseType;
  if (
    finding.phase !== "same-version" ||
    finding.diff.kind !== "OperationRemoved" ||
    operation?.kind !== "Operation"
  ) {
    return undefined;
  }

  const parent = operation.interface ?? operation.namespace;
  if (!parent) return undefined;
  const names: string[] = [];
  let namespace: Namespace | undefined = parent.kind === "Interface" ? parent.namespace : parent;
  while (namespace?.name) {
    names.unshift(namespace.name);
    namespace = namespace.namespace;
  }
  let headNamespace = program.getGlobalNamespaceType();
  for (const name of names) {
    const child = headNamespace.namespaces.get(name);
    if (!child) return undefined;
    headNamespace = child;
  }
  const target =
    parent.kind === "Interface" ? headNamespace.interfaces.get(parent.name) : headNamespace;
  if (!target?.node) return undefined;

  return { target, path: operation.name, scope: "declaration" };
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
