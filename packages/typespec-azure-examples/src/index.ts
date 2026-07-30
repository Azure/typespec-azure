/**
 * `@azure-tools/typespec-azure-examples` — tooling for the Azure unified examples format
 * (`examples.yaml`). This entrypoint exposes the JSON Schema and the programmatic validation API
 * used by the `tsp-examples validate` command.
 */
export { discoverExampleFiles, validateExamplesDir, type ValidateDirResult } from "./discover.js";
export {
  isQuotedScalar,
  loadExampleFile,
  locationAt,
  parseServiceVersions,
  positionAt,
  type LoadedExampleFile,
  type Position,
} from "./loader.js";
export * from "./migrate/index.js";
export { formatDiagnostics, formatSummary } from "./reporter.js";
export * from "./resolve/index.js";
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
