import type { Type } from "@typespec/compiler";
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
