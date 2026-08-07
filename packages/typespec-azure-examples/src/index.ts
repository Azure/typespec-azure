/**
 * `@azure-tools/typespec-azure-examples` — tooling for the Azure unified examples format
 * (`examples.yaml`). This entrypoint exposes the JSON Schema and the programmatic validation API
 * used by the `examples-validate` CLI.
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
export { formatDiagnostics, formatSummary } from "./reporter.js";
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
