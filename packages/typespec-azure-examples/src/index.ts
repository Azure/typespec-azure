/**
 * `@azure-tools/typespec-azure-examples` — tooling for the Azure unified examples format
 * (`examples.yaml`). This entrypoint exposes browser-compatible parsing, validation, resolution,
 * and materialization APIs. Filesystem and CLI helpers are exposed by the Node.js entrypoint.
 */
export { materializeLegacyExample, type LegacyExample } from "./legacy.js";
export {
  isQuotedScalar,
  loadExampleFile,
  locationAt,
  parseServiceVersions,
  positionAt,
  type LoadedExampleFile,
  type Position,
} from "./loader.js";
export {
  buildLineages,
  type BuildLineagesOptions,
  type CollectedExample,
} from "./migrate/dedup.js";
export {
  buildExamplesObject,
  planFiles,
  serializeExamplesYaml,
  type EmittedFile,
  type OperationEntry,
} from "./migrate/emit.js";
export type { MigratedRequest, MigratedResponse, MigratedVariant } from "./migrate/model.js";
export { normalizeApiVersion, normalizeApiVersions } from "./migrate/normalize.js";
export { deriveOperationKey, interfaceOf } from "./migrate/operation-key.js";
export { transformExample } from "./migrate/transform.js";
export {
  comparatorFromOrder,
  defaultCompareVersions,
  earliestVersion,
  latestVersion,
} from "./migrate/version-order.js";
export { defaultLegacyExampleFilename, slugify, stripJsonExtension } from "./naming.js";
export { substituteApiVersion } from "./resolve/materialize.js";
export {
  resolveExampleFiles,
  type ResolveResult,
  type ResolvedExample,
} from "./resolve/resolve.js";
export { selectApplicable, type HasSince } from "./resolve/select.js";
export { checkFilePlacement, checkSemantics, type SemanticContext } from "./rules.js";
export { ExamplesYamlSchema } from "./schema.js";
export type {
  DiagnosticSeverity,
  ExampleDiagnostic,
  ExampleRequest,
  ExampleResponse,
  ExampleVariant,
  ServiceVersions,
} from "./types.js";
export { checkStructure, validateExampleFiles } from "./validate.js";
