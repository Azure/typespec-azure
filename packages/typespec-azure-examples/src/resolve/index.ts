/**
 * `examples-resolve`: resolve the applicable example for each operation at a target API version.
 */
export { substituteApiVersion } from "./materialize.js";
export { resolveExamplesDir, type ResolveDirResult } from "./resolve-dir.js";
export { resolveExampleFiles, type ResolveResult, type ResolvedExample } from "./resolve.js";
export { selectApplicable, type HasSince } from "./select.js";
