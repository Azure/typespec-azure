import type { Program, Type } from "@typespec/compiler";
import type { DiffKind } from "../diff-kind.js";
import { BreakingChangeStateKeys } from "../lib.js";
import type { SuppressionMetadata } from "./decorators.js";

/**
 * A normalized suppression record that can be compared across compilations
 * without relying on TypeSpec object identity.
 */
export interface NormalizedSuppressionRecord {
  /** Decorator family */
  decorator: "approvedBreakingChange" | "approvedUnversionedChange";
  /** Stable identity of the declaration this is attached to */
  anchorIdentity: string;
  /** Whether decorator is on the target declaration or an ancestor */
  placement: "direct" | "ancestor";
  /** DiffKind this suppression covers — PART OF IDENTITY KEY */
  kind?: DiffKind;
  /** Path for parent placement — PART OF IDENTITY KEY */
  path?: string;
  /** Version this suppression applies to (metadata, used for MODIFIED detection) */
  since?: string;
  /** Human reason (metadata, used for MODIFIED detection) */
  reason: string;
  /** Source file path (for reporting) */
  sourceFile?: string;
  /** Source line number (for reporting) */
  sourceLine?: number;
  /** Index among decorators on this same node (for deterministic ordering) */
  localIndex: number;
}

/**
 * Compute the identity key for a normalized suppression record.
 * Two records with the same identity key represent the "same" suppression
 * across compilations.
 */
export function suppressionIdentityKey(record: NormalizedSuppressionRecord): string {
  return [
    record.decorator,
    record.anchorIdentity,
    record.placement,
    record.kind ?? "*",
    record.path ?? "",
  ].join("|");
}

/**
 * Extract the stable anchor identity for a TypeSpec type.
 * This must be consistent across compilations of equivalent source.
 */
function getAnchorIdentity(type: Type): string {
  // Use the type's fully-qualified name path
  switch (type.kind) {
    case "Model": {
      const model = type as any;
      if (model.name) {
        const ns = getNamespacePath(model.namespace);
        return ns ? `${ns}.${model.name}` : model.name;
      }
      return `anonymous-model`;
    }
    case "ModelProperty": {
      const prop = type as any;
      const parentId = prop.model ? getAnchorIdentity(prop.model) : "unknown";
      return `${parentId}.${prop.name}`;
    }
    case "Operation": {
      const op = type as any;
      const parentId = op.interface
        ? getAnchorIdentity(op.interface)
        : op.namespace
          ? getNamespacePath(op.namespace)
          : "global";
      return `${parentId}.${op.name}`;
    }
    case "Interface": {
      const iface = type as any;
      const ns = getNamespacePath(iface.namespace);
      return ns ? `${ns}.${iface.name}` : iface.name;
    }
    case "Namespace": {
      return getNamespacePath(type as any);
    }
    case "Enum": {
      const enumType = type as any;
      const ns = getNamespacePath(enumType.namespace);
      return ns ? `${ns}.${enumType.name}` : enumType.name;
    }
    case "EnumMember": {
      const member = type as any;
      const enumId = member.enum ? getAnchorIdentity(member.enum) : "unknown";
      return `${enumId}.${member.name}`;
    }
    case "Union": {
      const union = type as any;
      if (union.name) {
        const ns = getNamespacePath(union.namespace);
        return ns ? `${ns}.${union.name}` : union.name;
      }
      return "anonymous-union";
    }
    case "Scalar": {
      const scalar = type as any;
      const ns = getNamespacePath(scalar.namespace);
      return ns ? `${ns}.${scalar.name}` : scalar.name;
    }
    default:
      return `unknown-${type.kind}`;
  }
}

function getNamespacePath(ns: any): string {
  if (!ns) return "";
  const parts: string[] = [];
  let current = ns;
  while (current && current.name) {
    // Skip the root/global namespace
    if (current.name === "" || current.name === "TypeSpec") break;
    parts.unshift(current.name);
    current = current.namespace;
  }
  return parts.join(".");
}

/**
 * Build a normalized suppression inventory from a compiled program.
 * Scans all suppression state maps and produces stable, comparable records.
 */
export function buildSuppressionInventory(program: Program): NormalizedSuppressionRecord[] {
  const records: NormalizedSuppressionRecord[] = [];

  collectFromStateMap(
    program,
    BreakingChangeStateKeys.approvedBreakingChange,
    "approvedBreakingChange",
    records,
  );
  collectFromStateMap(
    program,
    BreakingChangeStateKeys.approvedUnversionedChange,
    "approvedUnversionedChange",
    records,
  );

  return records;
}

function collectFromStateMap(
  program: Program,
  stateKey: symbol,
  decorator: "approvedBreakingChange" | "approvedUnversionedChange",
  records: NormalizedSuppressionRecord[],
): void {
  if (typeof program.stateMap !== "function") return;
  const stateMap = program.stateMap(stateKey);
  for (const [target, suppressions] of stateMap) {
    const type = target as Type;
    const anchorIdentity = getAnchorIdentity(type);
    const metadataList = suppressions as SuppressionMetadata[];

    for (let i = 0; i < metadataList.length; i++) {
      const metadata = metadataList[i];
      // Determine placement: if path is present, it's parent/ancestor placement
      const placement = metadata.path ? "ancestor" : "direct";

      const record: NormalizedSuppressionRecord = {
        decorator,
        anchorIdentity,
        placement,
        kind: metadata.kind,
        path: metadata.path,
        since: metadata.version,
        reason: metadata.reason,
        localIndex: i,
      };

      // Try to get source location
      const node = (type as any).node;
      if (node?.file) {
        record.sourceFile = node.file.path;
        if (node.pos !== undefined && node.file.getLineAndCharacterOfPosition) {
          const lineChar = node.file.getLineAndCharacterOfPosition(node.pos);
          record.sourceLine = lineChar.line + 1;
        }
      }

      records.push(record);
    }
  }
}
