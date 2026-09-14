import { diffKinds, type DiffKind } from "./diff-kind.js";
import { phaseBRuleCatalog } from "./pipeline/policy.js";

export type DiffKindSupportStatus = "emitted" | "derived" | "declared-only";

export interface DiffKindCatalogEntry {
  kind: DiffKind;
  status: DiffKindSupportStatus;
  producer?: string;
  sourceKinds?: readonly DiffKind[];
  phaseBSeverity: "error" | "ignore";
  phaseBRule: string;
}

const declaredOnlyKinds: ReadonlySet<DiffKind> = new Set([
  "ApiVersionRemoved",
  "ApiVersionAdded",
  "AuthSchemeRemoved",
  "AuthSchemeAdded",
  "OAuthScopeAdded",
  "OAuthScopeRemoved",
  "OperationRouteChanged",
  "RequestParameterRenamed",
  "RequestParameterDefaultChanged",
  "RequestParameterLocationChanged",
  "RequestPropertyRenamed",
  "RequestPropertyDefaultChanged",
  "RequestEncodingChanged",
  "RequestConstraintStrengthened",
  "RequestConstraintRelaxed",
  "ResponsePropertyRenamed",
  "ResponseEncodingChanged",
  "ResponseConstraintStrengthened",
  "ResponseConstraintRelaxed",
  "ErrorResponseAdded",
  "ErrorResponseRemoved",
  "TypeKindChanged",
  "EnumerationOpened",
  "EnumerationClosed",
  "DiscriminatorChanged",
  "DefaultValueAdded",
  "DefaultValueRemoved",
  "DefaultValueChanged",
  "ResourcePropertyRenamed",
]);

const derivedKinds = {
  ResourcePropertyAdded: ["RequestPropertyAdded", "ResponsePropertyAdded"],
  ResourcePropertyRemoved: ["RequestPropertyRemoved", "ResponsePropertyRemoved"],
  ResourcePropertyTypeChanged: [
    "RequestPropertyTypeChanged",
    "ResponsePropertyTypeChanged",
  ],
  ResourcePropertyTypeNarrowed: [
    "RequestPropertyTypeNarrowed",
    "ResponsePropertyTypeNarrowed",
  ],
  ResourcePropertyTypeWidened: [
    "RequestPropertyTypeWidened",
    "ResponsePropertyTypeWidened",
  ],
  ResourcePropertyMadeRequired: [
    "RequestPropertyMadeRequired",
    "ResponsePropertyMadeRequired",
  ],
  ResourcePropertyMadeOptional: [
    "RequestPropertyMadeOptional",
    "ResponsePropertyMadeOptional",
  ],
} as const satisfies Partial<Record<DiffKind, readonly DiffKind[]>>;

const operationDiffKinds: ReadonlySet<DiffKind> = new Set([
  "OperationRemoved",
  "OperationAdded",
]);

const operationStructureDiffKinds: ReadonlySet<DiffKind> = new Set([
  "RequestPathParameterAdded",
  "RequestPathParameterRemoved",
  "RequestQueryParameterAdded",
  "RequestQueryParameterRemoved",
  "RequestHeaderAdded",
  "RequestHeaderRemoved",
  "RequestParameterMadeRequired",
  "RequestParameterMadeOptional",
  "RequestContentTypeAdded",
  "RequestContentTypeRemoved",
  "ResponseStatusCodeAdded",
  "ResponseStatusCodeRemoved",
  "ResponseContentTypeAdded",
  "ResponseContentTypeRemoved",
  "ResponseHeaderAdded",
  "ResponseHeaderRemoved",
]);

export const diffKindCatalog: readonly DiffKindCatalogEntry[] = diffKinds.map((kind) => {
  const classification = phaseBRuleCatalog[kind];
  const sourceKinds = derivedKinds[kind as keyof typeof derivedKinds];

  if (sourceKinds) {
    return {
      kind,
      status: "derived",
      producer: "pipeline/orchestrator.mergeRequestResponseToResource",
      sourceKinds,
      phaseBSeverity: classification.severity,
      phaseBRule: classification.rule,
    };
  }

  if (declaredOnlyKinds.has(kind)) {
    return {
      kind,
      status: "declared-only",
      phaseBSeverity: classification.severity,
      phaseBRule: classification.rule,
    };
  }

  return {
    kind,
    status: "emitted",
    producer: getProducer(kind),
    phaseBSeverity: classification.severity,
    phaseBRule: classification.rule,
  };
});

export function getDiffKindCatalogEntry(kind: DiffKind): DiffKindCatalogEntry {
  return diffKindCatalog[diffKinds.indexOf(kind)];
}

function getProducer(kind: DiffKind): string {
  if (operationDiffKinds.has(kind)) {
    return "diff/diff-engine.computeDiffs";
  }
  if (operationStructureDiffKinds.has(kind)) {
    return "diff/diff-operations.diffOperations";
  }
  return "diff/diff-types.compareTypes";
}
