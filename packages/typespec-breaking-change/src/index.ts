export {
  canonicalizeOperations,
  type CanonicalizationResult,
  type CanonicalizedOperation,
} from "./canonicalize.js";
export { formatResult, main, parseArgs, type CliOptions } from "./cli.js";
export { compileService, type CompileOptions } from "./compile.js";
export {
  $approvedBreakingChange,
  $approvedUnversionedChange,
  findSuppressions,
  findUnversionedSuppressions,
  getSuppressions,
  getUnversionedSuppressions,
  type ResolvedSuppression,
  type SuppressionMetadata,
} from "./decorators.js";
export * from "./diff-engine.js";
export type { DiffKind } from "./diff-kind.js";
export * from "./diff-operations.js";
export * from "./diff-types.js";
export { $lib, BreakingChangeStateKeys } from "./lib.js";
export { matchOperations, type MatchedOperation, type OperationMatchResult } from "./match.js";
export {
  getOperationIdentity,
  identityKey,
  normalizePath,
  resolveOperationIdentities,
  type OperationIdentityMap,
  type ResolvedOperation,
} from "./operation-identity.js";
export { resolveOrigin } from "./origin.js";
export * from "./orchestrator.js";
export * from "./policy.js";
export * from "./reporter-console.js";
export * from "./reporter-github.js";
export * from "./reporter-json.js";
export * from "./suppression.js";
export { isOperationIdentity, isServiceIdentity } from "./types.js";
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
export {
  buildComparisonPairs,
  buildPhaseAPairs,
  buildPhaseBPairs,
  createVersionedView,
  defaultVersionClassifier,
  enumerateVersions,
  type ServiceVersionInfo,
  type VersionClassifier,
} from "./versions.js";
