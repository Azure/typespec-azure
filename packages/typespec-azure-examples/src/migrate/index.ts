/**
 * `tsp-examples-migrate`: convert classic `x-ms-examples` JSON into the unified `examples.yaml` format.
 */
export { buildLineages, type BuildLineagesOptions, type CollectedExample } from "./dedup.js";
export {
  buildExamplesObject,
  planFiles,
  serializeExamplesYaml,
  type EmittedFile,
  type OperationEntry,
} from "./emit.js";
export { migrate, type MigrateOptions, type MigrateResult } from "./migrate.js";
export type { MigratedRequest, MigratedResponse, MigratedVariant } from "./model.js";
export { normalizeApiVersion, normalizeApiVersions } from "./normalize.js";
export { deriveOperationKey, interfaceOf } from "./operation-key.js";
export {
  collectParamLocations,
  crawlExamples,
  discoverSwaggerFiles,
  extractOperations,
  namespaceFromPaths,
  resolveLocalParam,
  resolveRefPath,
  versionFromPath,
  type CrawlResult,
  type CrawledExample,
  type ExtractedOperation,
} from "./swagger.js";
export { transformExample } from "./transform.js";
export { comparatorFromOrder, defaultCompareVersions, earliestVersion } from "./version-order.js";
