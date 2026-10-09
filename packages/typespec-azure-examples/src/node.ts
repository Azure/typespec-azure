/**
 * Node.js entrypoint, including filesystem discovery, migration, and diagnostic reporting.
 */
export * from "./add/index.js";
export { discoverExampleFiles, validateExamplesDir, type ValidateDirResult } from "./discover.js";
export * from "./index.js";
export * from "./migrate/index.js";
export { formatDiagnostics, formatSummary } from "./reporter.js";
export * from "./resolve/index.js";
