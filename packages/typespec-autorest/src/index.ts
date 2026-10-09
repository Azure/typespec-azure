export * from "./decorators.js";
export { $onEmit, getAllServicesAtAllVersions, resolveAutorestOptions } from "./emit.js";
export { $lib, type AutorestEmitterOptions } from "./lib.js";
export {
  getOpenAPIForService,
  sortOpenAPIDocument,
  type AutorestDocumentEmitterOptions,
} from "./openapi.js";
export type * from "./openapi2-document.js";
export type { AutorestEmitterContext } from "./utils.js";

/** @internal */
export { $decorators } from "./tsp-index.js";
