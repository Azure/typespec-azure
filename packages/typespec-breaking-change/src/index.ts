export type { DiffKind } from "./diff-kind.js";
export type {
  AnalysisResult,
  ApiDiff,
  ComparisonPair,
  ComparisonPhase,
  DiffComponent,
  DiffIdentity,
  Finding,
  OperationDiffIdentity,
  OperationIdentity,
  OriginDeclaration,
  ServiceDiffIdentity,
  TimingInfo,
  VersionPair,
  VersionedView,
} from "./types.js";
export { isOperationIdentity, isServiceIdentity } from "./types.js";
export { compileService, type CompileOptions } from "./compile.js";
export {
  enumerateVersions,
  createVersionedView,
  buildComparisonPairs,
  buildPhaseAPairs,
  buildPhaseBPairs,
  defaultVersionClassifier,
  type ServiceVersionInfo,
  type VersionClassifier,
} from "./versions.js";
export {
  resolveOperationIdentities,
  normalizePath,
  getOperationIdentity,
  identityKey,
  type OperationIdentityMap,
  type ResolvedOperation,
} from "./operation-identity.js";
export {
  matchOperations,
  type OperationMatchResult,
  type MatchedOperation,
} from "./match.js";
