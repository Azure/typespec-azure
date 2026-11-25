/**
 * `tsp-examples add`: add examples for a newly-introduced API version, adding an example only when
 * an operation is new or its contract changed (parity with OpenAPI-diff).
 */
export { add, type AddOptions, type AddResult, type AddedExample } from "./add.js";
export { canonicalEqual, diffOperation, type OperationDiff } from "./diff.js";
export { extractOperationSignatures, type OperationSignature } from "./signature.js";
export { skeletonForOperation, skeletonForSchema, type ExampleSkeleton } from "./skeleton.js";
